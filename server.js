/* NVR Space — backend: static hosting + real account API.
 *
 * Zero dependencies on purpose: npm is blocked by the machine's execution
 * policy, and Node 24 ships everything needed in core — node:http for the
 * server, node:crypto.scryptSync for password hashing, node:fs for storage.
 *
 *   run:  node server.js [port]      (default 8149)
 *   then: http://<this-machine-LAN-IP>:<port>  works from any device on the WiFi
 *
 * What it adds over the static build: accounts that follow a person across
 * devices. localStorage accounts were per-browser; these live in data/db.json
 * on the server, keyed by a session cookie.
 */
'use strict';

const http = require('node:http');
const crypto = require('node:crypto');
const fs = require('node:fs');
const path = require('node:path');
const { URL } = require('node:url');

const ROOT = __dirname;
/* DATA_DIR lets a host point at a mounted persistent disk. On free tiers the
   container filesystem is usually wiped on every redeploy — without a disk,
   every account is lost each deploy. */
const DATA_DIR = process.env.DATA_DIR || path.join(ROOT, 'data');
const DB_FILE = path.join(DATA_DIR, 'db.json');
/* Hosts (Render/Railway/Fly/Heroku) inject PORT as an env var; the CLI arg is
   only the local convenience. Reading env first is what makes deploy work. */
const PORT = parseInt(process.env.PORT || process.argv[2] || '8149', 10);
const HOST = process.env.HOST || '0.0.0.0'; // reachable from the LAN and from hosts
/* Set COOKIE_SECURE=1 once the site is behind HTTPS so the session cookie
   stops travelling over plain http. */
const COOKIE_SECURE = process.env.COOKIE_SECURE === '1';

const SESSION_DAYS = 30;
const MAX_BODY = 64 * 1024; // 64 KB is plenty for JSON payloads
const HISTORY_MAX = 200;

/* ------------------------------------------------------------------ *
 * mailer — pluggable, zero-dependency.
 *
 * With RESEND_API_KEY set, real email goes out through the Resend HTTP API
 * (a plain fetch, no SDK). Without it the server falls back to DEV MODE:
 * the link is printed to the console and returned in the API response, so
 * the whole flow is testable with no mail provider at all. It never
 * silently pretends to have sent something it couldn't.
 * ------------------------------------------------------------------ */
const MAIL_FROM = process.env.MAIL_FROM || 'NVR Space <no-reply@nvrspace.app>';
const RESEND_API_KEY = process.env.RESEND_API_KEY || '';
const REQUIRE_VERIFICATION = process.env.REQUIRE_VERIFICATION === '1';

async function sendMail(to, subject, text) {
  if (!RESEND_API_KEY) {
    console.log('\n' + '='.repeat(68) +
      '\n  [DEV MAILER] no RESEND_API_KEY set — link printed here instead\n' +
      '  to: ' + to + '\n  subject: ' + subject + '\n' +
      text + '\n' + '='.repeat(68) + '\n');
    return { delivered: false, devMode: true, body: text };
  }
  try {
    const res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Authorization': 'Bearer ' + RESEND_API_KEY,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ from: MAIL_FROM, to: [to], subject, text }),
    });
    if (!res.ok) {
      console.error('[mailer] provider rejected the message: ' + res.status +
        ' ' + (await res.text().catch(() => '')));
      return { delivered: false, devMode: false, error: 'mail provider rejected the message' };
    }
    return { delivered: true, devMode: false };
  } catch (e) {
    console.error('[mailer] send failed: ' + e.message);
    return { delivered: false, devMode: false, error: 'could not reach the mail provider' };
  }
}

/* Behind a proxy or a host, the public origin is not localhost. */
function publicOrigin() {
  return (process.env.PUBLIC_ORIGIN || 'http://localhost:' + PORT).replace(/\/+$/, '');
}

/* Dev mode puts the whole email — including a LIVE password-reset or
   verification link — in the API response so the flow can be tested without
   a mail provider. That is fine on your own machine and is a complete account
   takeover on a public server: anyone could POST /api/forgot-password with a
   victim's address and receive a working reset link.

   The body is therefore only handed back when the request is genuinely local.
   Checking the socket alone is NOT enough: a tunnel or reverse proxy (cloudflared,
   ngrok, nghttpd, a LAN proxy) runs on this machine too, so its forwarded
   traffic also arrives from 127.0.0.1 and would sail past that test. Proxy
   headers are what give the game away — cloudflared stamps CF-Connecting-IP and
   friends always overwrite whatever the client sent. */
function allowDevLinks(req) {
  const flag = process.env.DEV_MAIL_LINKS;
  if (flag === '1') return true;
  if (flag === '0') return false;

  const addr = (req.socket && req.socket.remoteAddress) || '';
  const loopback = addr === '127.0.0.1' || addr === '::1' || addr === '::ffff:127.0.0.1';
  if (!loopback) return false;

  /* came through something that is forwarding us a real client — refuse */
  const proxied = req.headers['cf-connecting-ip'] ||
    req.headers['x-forwarded-for'] ||
    req.headers['x-real-ip'] ||
    req.headers['forwarded'] ||
    req.headers['x-forwarded-host'] ||
    req.headers['cf-ray'];
  return !proxied;
}

/* ------------------------------------------------------------------ *
 * one-time tokens (email verification + password reset)
 *
 * Stored HASHED like passwords: if data/db.json ever leaks, a stolen token
 * cannot be replayed to take over an account. Single use and time-limited.
 * ------------------------------------------------------------------ */
const VERIFY_TTL = 24 * 60 * 60 * 1000;
const RESET_TTL = 60 * 60 * 1000;

function tokenHash(raw) {
  return crypto.createHash('sha256').update(String(raw).trim()).digest('hex');
}

function issueToken(store, userId, ttl) {
  const raw = crypto.randomBytes(32).toString('hex');
  store.push({ userId, hash: tokenHash(raw), expires: Date.now() + ttl });
  /* keep the table from growing without bound */
  while (store.length > 500) store.shift();
  return raw;
}

function consumeToken(store, raw) {
  if (!raw || typeof raw !== 'string') return null;
  const hash = tokenHash(raw);
  const idx = store.findIndex((t) => t.hash === hash);
  if (idx < 0) return null;
  const rec = store[idx];
  store.splice(idx, 1); // single use, expired or not
  if (rec.expires < Date.now()) return null;
  return rec.userId;
}

/* ------------------------------------------------------------------ *
 * storage — a tiny JSON file. Writes are atomic (tmp + rename) so a
 * crash mid-write can't truncate the database.
 * ------------------------------------------------------------------ */
const db = { users: [], sessions: {}, verifyTokens: [], resetTokens: [], videos: [], comments: {}, likes: {}, saves: {}, subs: {} };

function loadDb() {
  try {
    const raw = fs.readFileSync(DB_FILE, 'utf8');
    const parsed = JSON.parse(raw);
    db.users = Array.isArray(parsed.users) ? parsed.users : [];
    db.sessions = parsed.sessions && typeof parsed.sessions === 'object' ? parsed.sessions : {};
    db.verifyTokens = Array.isArray(parsed.verifyTokens) ? parsed.verifyTokens : [];
    db.resetTokens = Array.isArray(parsed.resetTokens) ? parsed.resetTokens : [];
    db.videos = Array.isArray(parsed.videos) ? parsed.videos : [];
    db.comments = parsed.comments && typeof parsed.comments === 'object' ? parsed.comments : {};
    db.likes = parsed.likes && typeof parsed.likes === 'object' ? parsed.likes : {};
    db.saves = parsed.saves && typeof parsed.saves === 'object' ? parsed.saves : {};
    db.subs = parsed.subs && typeof parsed.subs === 'object' ? parsed.subs : {};
  } catch (e) {
    db.users = [];
    db.sessions = {};
    db.verifyTokens = [];
    db.resetTokens = [];
    db.videos = [];
    db.comments = {};
    db.likes = {};
    db.saves = {};
    db.subs = {};
  }
  seedVideos();
  // drop expired sessions + tokens on boot so the file doesn't grow forever
  const now = Date.now();
  let dropped = 0;
  for (const [tok, s] of Object.entries(db.sessions)) {
    if (!s || s.expires < now) { delete db.sessions[tok]; dropped++; }
  }
  for (const key of ['verifyTokens', 'resetTokens']) {
    const before = db[key].length;
    db[key] = db[key].filter((t) => t && t.expires >= now);
    dropped += before - db[key].length;
  }
  if (dropped) saveDb();
}

function saveDb() {
  fs.mkdirSync(DATA_DIR, { recursive: true });
  const tmp = DB_FILE + '.tmp';
  fs.writeFileSync(tmp, JSON.stringify(db, null, 2), 'utf8');
  fs.renameSync(tmp, DB_FILE);
}

/* Seed the catalog on first boot so the app behaves like a real media
   platform out of the box. Only runs when the table is empty. */
function seedVideos() {
  if (db.videos.length) return;
  const now = Date.now();
  db.videos = [
    { id: 'v1', type: 'video', title: 'How I Built a Website from Scratch', channel: 'Code With Me', avatar: 'img/profile-picture.png', time: '2h', created: now - 7.2e6, media: 'img/image_1.jpg', video: 'video/watch1.mp4', duration: '12:04', likes: 1200, comments: 340, shares: 89, text: 'Full breakdown of the stack, the design decisions, and how the deploy pipeline works.', views: 184209 },
    { id: 'v2', type: 'video', title: 'CSS Grid in 10 Minutes', channel: 'Web Wizards', avatar: 'img/profile-picture.png', time: '1d', created: now - 8.64e7, media: 'img/image_d.jpg', video: 'video/watch1.mp4', duration: '10:00', likes: 3400, comments: 520, shares: 210 },
    { id: 'v3', type: 'video', title: 'My Coding Journey — year three update', channel: 'Nifemi Codes', avatar: 'img/channels4_profile.jpg', time: '2d', created: now - 1.73e8, media: 'img/image_19.jpg', video: 'video/watch1.mp4', duration: '8:36', likes: 980, comments: 201, shares: 45, text: 'Three years of building things.' },
    { id: 'v4', type: 'video', title: 'JavaScript tips you will actually use', channel: 'Dev Tips', avatar: 'img/channels4_profile.jpg', time: '3d', created: now - 2.6e8, media: 'img/image_2.jpg', video: 'video/watch1.mp4', duration: '9:12', likes: 1750, comments: 267, shares: 98 },
    { id: 'v5', type: 'video', title: 'The design system that took me 6 months to build', channel: 'Code With Me', avatar: 'img/profile-picture.png', time: '4d', created: now - 3.46e8, media: 'img/image_1.jpg', video: 'video/watch1.mp4', duration: '18:05', likes: 7300, comments: 980, shares: 870 },
    { id: 'v6', type: 'video', title: 'Why everyone is going back to vanilla JS in 2026', channel: 'Web Wizards', avatar: 'img/profile-picture.png', time: '5d', created: now - 4.32e8, media: 'img/image_2.jpg', video: 'video/watch1.mp4', duration: '11:47', likes: 11200, comments: 1900, shares: 2600 },
    { id: 's1', type: 'short', title: 'POV: your code works first try', channel: 'Nifemi Codes', avatar: 'img/channels4_profile.jpg', time: '3h', created: now - 1.08e7, media: 'img/image_19.jpg', video: 'video/short1.mp4', likes: 5400, comments: 430, shares: 1200 },
    { id: 's2', type: 'short', title: 'Behind the scenes of today’s shoot', channel: 'Code With Me', avatar: 'img/profile-picture.png', time: '8h', created: now - 2.88e7, media: 'img/image_d.jpg', video: 'video/short2.mp4', likes: 3200, comments: 189, shares: 430 },
    { id: 'p1', type: 'photos', title: 'Studio setup tour — new episode every Friday', channel: 'Dev Tips', avatar: 'img/channels4_profile.jpg', time: '5h', created: now - 1.8e7, media: 'img/image_2.jpg', count: 4, likes: 860, comments: 112, shares: 23 },
    { id: 'p2', type: 'photos', title: 'Sketchbook dump: logo concepts for the rebrand', channel: 'Code With Me', avatar: 'img/profile-picture.png', time: '1d', created: now - 8.64e7, media: 'img/image_1.jpg', count: 3, likes: 640, comments: 98, shares: 12 },
    { id: 't1', type: 'text', title: 'Hot take: dark mode should be the default everywhere. Fight me in the comments.', channel: 'Web Wizards', avatar: 'img/profile-picture.png', time: '6h', created: now - 2.16e7, likes: 2100, comments: 890, shares: 140 },
    { id: 't2', type: 'text', title: 'Unpopular opinion: tutorials make you worse before they make you better. Build something ugly today.', channel: 'Dev Tips', avatar: 'img/channels4_profile.jpg', time: '12h', created: now - 4.32e7, likes: 1300, comments: 760, shares: 230 },
  ];
  db.comments.v1 = [
    { id: 'c1', name: 'Aurora Pixel', handle: '@aurorapixel', avatar: 'img/profile-picture.png', text: 'The bit where you rebuild the layout live instead of hiding the mistakes is why I keep coming back.', likes: 1820, ts: now - 8.64e7 },
    { id: 'c2', name: 'ByteSized', handle: '@bytesized', avatar: 'img/channels4_profile.jpg', text: '03:45 the grid explanation finally made CSS grid click for me.', likes: 940, ts: now - 7.92e7 },
  ];
  saveDb();
}

function publicVideo(v, userId) {
  if (!v) return null;
  const copy = Object.assign({}, v);
  if (userId) {
    copy.likedByMe = Array.isArray(db.likes[userId]) && db.likes[userId].indexOf(v.id) >= 0;
    copy.savedByMe = Array.isArray(db.saves[userId]) && db.saves[userId].indexOf(v.id) >= 0;
    copy.subscribedToChannel = Array.isArray(db.subs[userId]) && db.subs[userId].indexOf(v.channel) >= 0;
  }
  return copy;
}

function toggleInList(map, userId, key) {
  const list = Array.isArray(map[userId]) ? map[userId] : [];
  const i = list.indexOf(key);
  if (i >= 0) list.splice(i, 1); else list.push(key);
  map[userId] = list;
  return i < 0; // true = now present
}

/* ------------------------------------------------------------------ *
 * passwords — scrypt with a per-user random salt. Never stored or
 * logged in plaintext, never returned by the API.
 * ------------------------------------------------------------------ */
const SCRYPT_KEYLEN = 64;

function hashPassword(password, saltHex) {
  const salt = saltHex ? Buffer.from(saltHex, 'hex') : crypto.randomBytes(16);
  const hash = crypto.scryptSync(password, salt, SCRYPT_KEYLEN);
  return { salt: salt.toString('hex'), hash: hash.toString('hex') };
}

function verifyPassword(password, user) {
  if (!user || !user.salt || !user.hash) return false;
  let candidate;
  try {
    candidate = crypto.scryptSync(password, Buffer.from(user.salt, 'hex'), SCRYPT_KEYLEN);
  } catch (e) {
    return false;
  }
  const stored = Buffer.from(user.hash, 'hex');
  // timingSafeEqual throws on length mismatch, so guard first
  if (stored.length !== candidate.length) return false;
  return crypto.timingSafeEqual(stored, candidate);
}

/* ------------------------------------------------------------------ *
 * sessions — random token in an HttpOnly cookie. Server-side record so
 * signing out (or deleting an account) actually revokes access.
 * ------------------------------------------------------------------ */
function createSession(userId) {
  const token = crypto.randomBytes(32).toString('hex');
  db.sessions[token] = {
    userId,
    created: Date.now(),
    expires: Date.now() + SESSION_DAYS * 24 * 60 * 60 * 1000,
  };
  saveDb();
  return token;
}

function sessionUser(req) {
  const token = readCookie(req, 'nvr_session');
  if (!token) return null;
  const s = db.sessions[token];
  if (!s) return null;
  if (s.expires < Date.now()) { delete db.sessions[token]; saveDb(); return null; }
  return db.users.find((u) => u.id === s.userId) || null;
}

function destroySession(req) {
  const token = readCookie(req, 'nvr_session');
  if (token && db.sessions[token]) {
    delete db.sessions[token];
    saveDb();
  }
}

/* login throttling — in-memory, per email+ip. Enough to stop casual guessing */
const attempts = new Map(); // key -> { count, first }
const MAX_ATTEMPTS = 8;
const ATTEMPT_WINDOW = 15 * 60 * 1000;

function throttleKey(req, email) {
  return (req.socket.remoteAddress || 'unknown') + '|' + String(email || '').toLowerCase();
}

function tooManyAttempts(req, email) {
  const rec = attempts.get(throttleKey(req, email));
  if (!rec) return false;
  if (Date.now() - rec.first > ATTEMPT_WINDOW) { attempts.delete(throttleKey(req, email)); return false; }
  return rec.count >= MAX_ATTEMPTS;
}

function noteFailure(req, email) {
  const k = throttleKey(req, email);
  const rec = attempts.get(k);
  if (!rec || Date.now() - rec.first > ATTEMPT_WINDOW) attempts.set(k, { count: 1, first: Date.now() });
  else rec.count++;
  /* opportunistically prune expired windows so the map can't grow forever */
  if (attempts.size > 500) {
    for (const [key, r] of attempts) {
      if (Date.now() - r.first > ATTEMPT_WINDOW) attempts.delete(key);
    }
  }
}

function clearFailures(req, email) {
  attempts.delete(throttleKey(req, email));
}

/* ------------------------------------------------------------------ *
 * small http helpers
 * ------------------------------------------------------------------ */
function readCookie(req, name) {
  const raw = req.headers.cookie;
  if (!raw) return null;
  for (const part of raw.split(';')) {
    const i = part.indexOf('=');
    if (i < 0) continue;
    if (part.slice(0, i).trim() === name) return decodeURIComponent(part.slice(i + 1).trim());
  }
  return null;
}

function sendJson(res, status, payload, extraHeaders) {
  const body = JSON.stringify(payload);
  res.writeHead(status, Object.assign({
    'Content-Type': 'application/json; charset=utf-8',
    'Cache-Control': 'no-store',
    'Content-Length': Buffer.byteLength(body),
    'X-Content-Type-Options': 'nosniff',
    'X-Frame-Options': 'DENY',
    'Referrer-Policy': 'same-origin',
  }, extraHeaders || {}));
  res.end(body);
}

function readBody(req, limit) {
  const max = limit || MAX_BODY;
  return new Promise((resolve, reject) => {
    let size = 0;
    const chunks = [];
    req.on('data', (c) => {
      size += c.length;
      if (size > max) { reject(new Error('body too large')); req.destroy(); return; }
      chunks.push(c);
    });
    req.on('end', () => {
      if (!chunks.length) return resolve({});
      try { resolve(JSON.parse(Buffer.concat(chunks).toString('utf8'))); }
      catch (e) { reject(new Error('invalid json')); }
    });
    req.on('error', reject);
  });
}

function setSessionCookie(token) {
  const maxAge = SESSION_DAYS * 24 * 60 * 60;
  return 'nvr_session=' + encodeURIComponent(token) + '; Path=/; Max-Age=' + maxAge +
    '; HttpOnly; SameSite=Lax' + (COOKIE_SECURE ? '; Secure' : '');
}

/* Shared "clear the session cookie" value, so logout and account deletion
   can't drift apart (and both honour Secure). */
const CLEAR_COOKIE = 'nvr_session=; Path=/; Max-Age=0; HttpOnly; SameSite=Lax' +
  (COOKIE_SECURE ? '; Secure' : '');

function publicUser(u) {
  if (!u) return null;
  return {
    id: u.id,
    name: u.name,
    handle: u.handle,
    email: u.email,
    verified: !!u.verified,
    prefs: u.prefs || {},
    created: u.created,
  };
}

/* ------------------------------------------------------------------ *
 * validation
 * ------------------------------------------------------------------ */
function cleanName(v) {
  return String(v == null ? '' : v).replace(/\s+/g, ' ').trim().slice(0, 24);
}
function cleanEmail(v) {
  return String(v == null ? '' : v).trim().toLowerCase().slice(0, 160);
}
function validEmail(e) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(e);
}
function passwordProblem(p) {
  const s = String(p == null ? '' : p);
  if (s.length < 8) return 'Password must be at least 8 characters';
  if (s.length > 200) return 'Password is too long';
  return null;
}
function handleFor(name) {
  const slug = name.toLowerCase().replace(/[^a-z0-9]+/g, '');
  return '@' + (slug || 'user');
}
function uniqueHandle(name) {
  let h = handleFor(name);
  let n = 2;
  while (db.users.some((u) => u.handle === h)) h = handleFor(name) + n++;
  return h;
}

/* ------------------------------------------------------------------ *
 * API
 * ------------------------------------------------------------------ */
async function handleApi(req, res, url) {
  const route = url.pathname.replace(/^\/api/, '') || '/';

  /* ---- who am I ----
   Signed out is 200 {user:null}, not 401: "nobody is logged in" is a normal
   answer to this question, and a 401 here makes every page load look like a
   failed request in devtools/monitoring. */
  if (route === '/me' && req.method === 'GET') {
    const u = sessionUser(req);
    if (!u) return sendJson(res, 200, { user: null, history: [] });
    return sendJson(res, 200, {
      user: publicUser(u),
      history: u.history || [],
      likes: db.likes[u.id] || [],
      saves: db.saves[u.id] || [],
      subs: db.subs[u.id] || [],
    });
  }

  /* ---- media catalog (public read) ---- */
  if (route === '/videos' && req.method === 'GET') {
    const me = sessionUser(req);
    let list = db.videos.slice();
    const type = url.searchParams.get('type');
    const q = (url.searchParams.get('q') || '').toLowerCase();
    const channel = url.searchParams.get('channel');
    if (type) list = list.filter((v) => v.type === type);
    if (channel) list = list.filter((v) => v.channel.toLowerCase() === channel.toLowerCase());
    if (q) list = list.filter((v) => (v.title + ' ' + v.channel).toLowerCase().includes(q));
    return sendJson(res, 200, { videos: list.map((v) => publicVideo(v, me && me.id)) });
  }

  /* ---- search (public) ---- */
  if (route === '/search' && req.method === 'GET') {
    const me = sessionUser(req);
    const q = (url.searchParams.get('q') || '').toLowerCase().trim();
    const list = q
      ? db.videos.filter((v) => (v.title + ' ' + v.channel + ' ' + (v.text || '')).toLowerCase().includes(q))
      : [];
    return sendJson(res, 200, { results: list.map((v) => publicVideo(v, me && me.id)) });
  }

  const vidMatch = route.match(/^\/videos\/([\w-]+)$/);
  if (vidMatch && req.method === 'GET') {
    const me = sessionUser(req);
    const v = db.videos.find((x) => x.id === vidMatch[1]);
    if (!v) return sendJson(res, 404, { error: 'not found' });
    return sendJson(res, 200, { video: publicVideo(v, me && me.id) });
  }

  const commentsMatch = route.match(/^\/videos\/([\w-]+)\/comments$/);
  if (commentsMatch && req.method === 'GET') {
    const list = (db.comments[commentsMatch[1]] || []).slice().sort((a, b) => b.ts - a.ts);
    return sendJson(res, 200, { comments: list });
  }

  /* ---- register ---- */
  if (route === '/register' && req.method === 'POST') {
    const b = await readBody(req);
    const name = cleanName(b.name);
    const email = cleanEmail(b.email);
    const pwProblem = passwordProblem(b.password);

    if (!name) { noteFailure(req, email); return sendJson(res, 400, { error: 'Please enter a name' }); }
    if (!validEmail(email)) { noteFailure(req, email); return sendJson(res, 400, { error: 'Please enter a valid email address' }); }
    if (pwProblem) { noteFailure(req, email); return sendJson(res, 400, { error: pwProblem }); }
    if (tooManyAttempts(req, email)) {
      return sendJson(res, 429, { error: 'Too many attempts. Try again in 15 minutes.' });
    }
    if (db.users.some((u) => u.email === email)) {
      noteFailure(req, email);
      return sendJson(res, 409, { error: 'An account with that email already exists' });
    }

    const { salt, hash } = hashPassword(b.password);
    const user = {
      id: 'u_' + crypto.randomBytes(8).toString('hex'),
      name,
      handle: uniqueHandle(name),
      email,
      salt,
      hash,
      verified: false,
      prefs: { autoplay: true, dataSaver: false, personalized: true },
      history: [],
      created: Date.now(),
    };
    db.users.push(user);
    clearFailures(req, email);
    const token = createSession(user.id);

    /* send the verification link (dev mode prints it if no mail provider) */
    const vToken = issueToken(db.verifyTokens, user.id, VERIFY_TTL);
    const mail = await sendMail(email, 'Verify your NVR Space account',
      'Hi ' + name + ',\n\nConfirm your email to finish setting up your NVR Space account:\n\n' +
      publicOrigin() + '/api/verify?token=' + vToken + '\n\n' +
      'This link works once and expires in 24 hours.\n');

    return sendJson(res, 201, {
      user: publicUser(user),
      history: [],
      mail: (mail.devMode && allowDevLinks(req))
        ? { devMode: true, body: mail.body }
        : { devMode: true, delivered: false, note: 'No mail provider configured — ask the server operator for your verification link.' },
    }, { 'Set-Cookie': setSessionCookie(token) });
  }

  /* ---- login ---- */
  if (route === '/login' && req.method === 'POST') {
    const b = await readBody(req);
    const email = cleanEmail(b.email);
    if (tooManyAttempts(req, email)) {
      return sendJson(res, 429, { error: 'Too many attempts. Try again in 15 minutes.' });
    }
    const pwProblem = passwordProblem(b.password);
    if (!validEmail(email) || pwProblem) {
      noteFailure(req, email);
      return sendJson(res, 401, { error: 'Email or password is incorrect' });
    }
    const user = db.users.find((u) => u.email === email);
    if (!user || !verifyPassword(String(b.password), user)) {
      noteFailure(req, email);
      // deliberately vague: never reveal which half was wrong
      return sendJson(res, 401, { error: 'Email or password is incorrect' });
    }
    /* Unverified accounts can normally still sign in (the UI nags them to
       verify) so nobody is ever locked out by a mail provider outage. Set
       REQUIRE_VERIFICATION=1 to make verification mandatory instead. */
    if (REQUIRE_VERIFICATION && !user.verified) {
      return sendJson(res, 403, {
        error: 'Please verify your email address first — check your inbox for the link.',
        needsVerification: true,
      });
    }
    clearFailures(req, email);
    const token = createSession(user.id);
    return sendJson(res, 200, { user: publicUser(user), history: user.history || [] },
      { 'Set-Cookie': setSessionCookie(token) });
  }

  /* ---- confirm email: GET so the link in the mail can be clicked ---- */
  if (route === '/verify' && req.method === 'GET') {
    const token = url.searchParams.get('token');
    const userId = consumeToken(db.verifyTokens, token);
    if (!userId) {
      const html = '<!doctype html><meta charset="utf-8"><title>Link expired</title>' +
        '<body style="font:16px system-ui;background:#0a0c11;color:#e9ecf4;display:grid;place-items:center;height:100vh;margin:0">' +
        '<div style="text-align:center;max-width:32rem;padding:2rem">' +
        '<h1 style="color:#64f0c7">That link no longer works</h1>' +
        '<p style="color:#a3adc2">Verification links work once and expire after 24 hours. ' +
        'Sign in and request a new one from your settings.</p></div>';
      res.writeHead(400, { 'Content-Type': 'text/html; charset=utf-8' }).end(html);
      return;
    }
    const u = db.users.find((x) => x.id === userId);
    if (u) { u.verified = true; saveDb(); }
    const html = '<!doctype html><meta charset="utf-8"><title>Email verified</title>' +
      '<body style="font:16px system-ui;background:#0a0c11;color:#e9ecf4;display:grid;place-items:center;height:100vh;margin:0">' +
      '<div style="text-align:center;max-width:32rem;padding:2rem">' +
      '<h1 style="color:#64f0c7">Email verified</h1>' +
      '<p style="color:#a3adc2">Your NVR Space account is ready. You can close this tab.</p>' +
      '<p><a href="/" style="color:#7b9cff">Back to NVR Space</a></p></div>';
    res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' }).end(html);
  }

  /* ---- resend verification (needs a session: you can't mail a stranger) ---- */
  if (route === '/resend-verification' && req.method === 'POST') {
    const me = sessionUser(req);
    if (!me) return sendJson(res, 401, { error: 'Please sign in again' });
    if (me.verified) return sendJson(res, 200, { verified: true });
    const token = issueToken(db.verifyTokens, me.id, VERIFY_TTL);
    const mail = await sendMail(me.email, 'Verify your NVR Space account',
      'Hi ' + me.name + ',\n\nConfirm your email to finish setting up your NVR Space account:\n\n' +
      publicOrigin() + '/api/verify?token=' + token + '\n\n' +
      'This link works once and expires in 24 hours.\n');
    return sendJson(res, 200,
      mail.devMode
        ? (allowDevLinks(req)
            ? { sent: false, devMode: true, body: mail.body }
            : { sent: false, devMode: true, note: 'No mail provider configured — ask the server operator to forward your link.' })
        : { sent: mail.delivered });
  }

  /* ---- forgot password ----
     Always answers 200 with the same body whether or not the email is
     known — otherwise this endpoint becomes a way to discover which
     addresses have accounts. */
  if (route === '/forgot-password' && req.method === 'POST') {
    const b = await readBody(req);
    const email = cleanEmail(b.email);
    const generic = { ok: true, message: 'If that email has an account, a reset link is on its way' };
    if (!validEmail(email) || tooManyAttempts(req, email)) return sendJson(res, 200, generic);
    const user = db.users.find((u) => u.email === email);
    if (!user) return sendJson(res, 200, generic);
    clearFailures(req, email);
    const token = issueToken(db.resetTokens, user.id, RESET_TTL);
    const mail = await sendMail(email, 'Reset your NVR Space password',
      'Hi ' + user.name + ',\n\nReset your password here (valid once, for one hour):\n\n' +
      publicOrigin() + '/reset.html?token=' + token + '\n\n' +
      "If you didn't ask for this, you can ignore this email — nothing changed.");
    return sendJson(res, 200, mail.devMode
      ? (allowDevLinks(req)
          ? Object.assign({ devMode: true, body: mail.body }, generic)
          /* remote caller: same shape as a known address, but no link —
             otherwise this endpoint is an account-takeover oracle */
          : Object.assign({ devMode: true }, generic))
      : generic);
  }

  /* ---- set the new password ---- */
  if (route === '/reset-password' && req.method === 'POST') {
    const b = await readBody(req);
    /* Validate the password BEFORE touching the token. consumeToken is
       single-use, so checking the password afterwards would destroy the
       user's link over a typo and force them to request a new one. */
    const problem = passwordProblem(b.password);
    if (problem) return sendJson(res, 400, { error: problem });

    const userId = consumeToken(db.resetTokens, b.token);
    if (!userId) {
      return sendJson(res, 400, { error: 'That reset link has expired or already been used' });
    }
    const user = db.users.find((u) => u.id === userId);
    if (!user) return sendJson(res, 400, { error: 'That reset link is no longer valid' });

    const { salt, hash } = hashPassword(b.password);
    user.salt = salt;
    user.hash = hash;
    /* every existing session dies — a password change logs other devices out */
    for (const [tok, s] of Object.entries(db.sessions)) {
      if (s.userId === user.id) delete db.sessions[tok];
    }
    /* burn any other outstanding reset links for this account */
    db.resetTokens = db.resetTokens.filter((t) => t.userId !== user.id);
    saveDb();
    return sendJson(res, 200, { ok: true });
  }

  /* ---- logout ---- */
  if (route === '/logout' && req.method === 'POST') {
    destroySession(req);
    return sendJson(res, 200, { ok: true }, { 'Set-Cookie': CLEAR_COOKIE });
  }

  /* everything past here needs a session */
  const user = sessionUser(req);
  if (!user) return sendJson(res, 401, { error: 'Please sign in again', user: null });

  /* ---- prefs ---- */
  if (route === '/prefs' && req.method === 'PUT') {
    const b = await readBody(req);
    const p = user.prefs || (user.prefs = {});
    for (const k of ['autoplay', 'dataSaver', 'personalized']) {
      if (typeof b[k] === 'boolean') p[k] = b[k];
    }
    saveDb();
    return sendJson(res, 200, { prefs: p });
  }

  /* ---- history: replace whole list (simplest correct sync) ---- */
  if (route === '/history' && req.method === 'PUT') {
    const b = await readBody(req);
    const list = Array.isArray(b.items) ? b.items.slice(0, HISTORY_MAX) : [];
    user.history = list.map((it) => ({
      title: String(it && it.title || '').slice(0, 200),
      channel: String(it && it.channel || '').slice(0, 120),
      thumb: String(it && it.thumb || '').slice(0, 300),
      ts: Number(it && it.ts) || Date.now(),
    })).filter((it) => it.title);
    saveDb();
    return sendJson(res, 200, { history: user.history });
  }

  if (route === '/history' && req.method === 'GET') {
    return sendJson(res, 200, { history: user.history || [] });
  }

  /* ---- media interactions (need a session so they can be per-user) ---- */
  const postComments = route.match(/^\/videos\/([\w-]+)\/comments$/);
  if (postComments && req.method === 'POST') {
    const v = db.videos.find((x) => x.id === postComments[1]);
    if (!v) return sendJson(res, 404, { error: 'not found' });
    const b = await readBody(req);
    const text = String(b.text || '').replace(/\s+/g, ' ').trim().slice(0, 500);
    if (!text) return sendJson(res, 400, { error: 'Comment cannot be empty' });
    const list = db.comments[v.id] || (db.comments[v.id] = []);
    list.push({
      id: 'c_' + crypto.randomBytes(6).toString('hex'),
      name: user.name,
      handle: user.handle,
      avatar: null,
      text,
      likes: 0,
      ts: Date.now(),
      mine: user.id,
    });
    v.comments = (v.comments || 0) + 1;
    saveDb();
    return sendJson(res, 201, { comment: list[list.length - 1], comments: v.comments });
  }

  const likeMatch = route.match(/^\/videos\/([\w-]+)\/like$/);
  if (likeMatch && req.method === 'POST') {
    const v = db.videos.find((x) => x.id === likeMatch[1]);
    if (!v) return sendJson(res, 404, { error: 'not found' });
    const nowLiked = toggleInList(db.likes, user.id, v.id);
    v.likes = Math.max(0, (v.likes || 0) + (nowLiked ? 1 : -1));
    saveDb();
    return sendJson(res, 200, { liked: nowLiked, likes: v.likes });
  }

  const saveMatch = route.match(/^\/videos\/([\w-]+)\/save$/);
  if (saveMatch && req.method === 'POST') {
    const v = db.videos.find((x) => x.id === saveMatch[1]);
    if (!v) return sendJson(res, 404, { error: 'not found' });
    const nowSaved = toggleInList(db.saves, user.id, v.id);
    saveDb();
    return sendJson(res, 200, { saved: nowSaved });
  }

  /* subscribe to a channel (by channel name) */
  if (route === '/subscribe' && req.method === 'POST') {
    const b = await readBody(req);
    const channel = String(b.channel || '').slice(0, 80);
    if (!channel) return sendJson(res, 400, { error: 'missing channel' });
    const nowSub = toggleInList(db.subs, user.id, channel);
    saveDb();
    return sendJson(res, 200, { subscribed: nowSub, channel });
  }

  /* upload — JSON {kind, title, channel, filename, dataBase64}. The file is
     written under video/ or img/ with a server-generated safe name, and a
     matching catalog entry is created for videos. */
  if (route === '/upload' && req.method === 'POST') {
    const b = await readBody(req, 96 * 1024 * 1024);
    const kind = String(b.kind || 'video');
    const title = String(b.title || 'Untitled').slice(0, 140);
    const safeName = 'up_' + Date.now() + '_' + crypto.randomBytes(4).toString('hex') +
      (kind === 'image' ? '.jpg' : '.mp4');
    const dir = kind === 'image' ? 'img' : 'video';
    try {
      fs.writeFileSync(path.join(ROOT, dir, safeName), Buffer.from(String(b.dataBase64 || ''), 'base64'));
    } catch (e) {
      return sendJson(res, 400, { error: 'could not store file' });
    }
    const v = {
      id: 'u' + Date.now().toString(36),
      type: kind === 'image' ? 'photos' : 'video',
      title,
      channel: String(b.channel || user.name).slice(0, 80),
      avatar: null,
      time: 'now',
      created: Date.now(),
      media: kind === 'image' ? dir + '/' + safeName : 'img/image_1.jpg',
      video: kind === 'image' ? undefined : dir + '/' + safeName,
      duration: '',
      likes: 0, comments: 0, shares: 0,
    };
    db.videos.unshift(v);
    saveDb();
    return sendJson(res, 201, { video: publicVideo(v, user.id) });
  }

  /* ---- delete account ---- */
  if (route === '/account' && req.method === 'DELETE') {
    db.users = db.users.filter((u) => u.id !== user.id);
    for (const [tok, s] of Object.entries(db.sessions)) if (s.userId === user.id) delete db.sessions[tok];
    saveDb();
    return sendJson(res, 200, { ok: true }, { 'Set-Cookie': CLEAR_COOKIE });
  }

  return sendJson(res, 404, { error: 'unknown endpoint' });
}

/* ------------------------------------------------------------------ *
 * static files
 * ------------------------------------------------------------------ */
const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.webp': 'image/webp',
  '.svg': 'image/svg+xml',
  '.mp4': 'video/mp4',
  '.ico': 'image/x-icon',
  '.txt': 'text/plain; charset=utf-8',
};

/* Files that must never be reachable over HTTP. data/db.json holds password
   hashes and live session tokens — serving it would hand over every account. */
const PRIVATE_FILES = new Set(['server.js', 'db.json', '.env', 'package.json', 'package-lock.json']);
const PRIVATE_DIRS = new Set(['data', 'node_modules', '.git']);

function isPrivate(target) {
  const rel = path.relative(ROOT, target);
  if (rel.startsWith('..')) return true;
  const parts = rel.split(path.sep);
  for (const part of parts.slice(0, -1)) {
    if (PRIVATE_DIRS.has(part)) return true;
  }
  const base = parts[parts.length - 1];
  if (PRIVATE_FILES.has(base)) return true;
  if (base.startsWith('.')) return true; // dotfiles: .env, .gitignore, .npmrc
  if (/\.(db|sqlite|pem|key)$/i.test(base)) return true;
  return false;
}

function serveStatic(req, res, url) {
  let rel;
  try {
    rel = decodeURIComponent(url.pathname);
  } catch (e) {
    res.writeHead(400, { 'Content-Type': 'text/plain; charset=utf-8' }).end('Bad request');
    return;
  }
  if (rel === '/' || rel === '') rel = '/index.html';

  // resolve inside ROOT only — blocks ../ traversal
  const target = path.resolve(ROOT, '.' + rel);
  if (target !== ROOT && !target.startsWith(ROOT + path.sep)) {
    res.writeHead(403).end('Forbidden');
    return;
  }
  if (isPrivate(target)) {
    res.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' }).end('Not found');
    return;
  }

  fs.stat(target, (err, stat) => {
    if (err || !stat.isFile()) {
      res.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' }).end('Not found');
      return;
    }
    const ext = path.extname(target).toLowerCase();
    const type = MIME[ext] || 'application/octet-stream';
    const headers = { 'Content-Type': type, 'Content-Length': stat.size };
    headers['Cache-Control'] = /\.(html|css|js)$/.test(ext) ? 'no-cache' : 'public, max-age=3600';
    headers['X-Content-Type-Options'] = 'nosniff';
    headers['X-Frame-Options'] = 'DENY';
    headers['Referrer-Policy'] = 'same-origin';
    res.writeHead(200, headers);
    fs.createReadStream(target).pipe(res);
  });
}

/* ------------------------------------------------------------------ *
 * server
 * ------------------------------------------------------------------ */
loadDb();

const server = http.createServer((req, res) => {
  const url = new URL(req.url, 'http://' + (req.headers.host || 'localhost'));

  /* Render/Railway/Fly poll this to decide the deploy is alive */
  if (url.pathname === '/healthz') {
    return sendJson(res, 200, { ok: true, users: db.users.length, uptime: process.uptime() });
  }

  if (url.pathname.startsWith('/api/')) {
    handleApi(req, res, url).catch((e) => {
      if (!res.headersSent) sendJson(res, 400, { error: e.message || 'bad request' });
    });
    return;
  }
  /* a malformed percent-encoding must not kill the process */
  try {
    serveStatic(req, res, url);
  } catch (e) {
    if (!res.headersSent) res.writeHead(400, { 'Content-Type': 'text/plain; charset=utf-8' });
    if (!res.writableEnded) res.end('Bad request');
  }
});

server.listen(PORT, HOST, () => {
  const nets = require('node:os').networkInterfaces();
  const lan = [];
  for (const list of Object.values(nets)) {
    for (const n of list || []) {
      if (n.family === 'IPv4' && !n.internal) lan.push(n.address);
    }
  }
  console.log('NVR Space backend listening on ' + HOST + ':' + PORT);
  if (process.env.PUBLIC_ORIGIN) {
    console.log('  public:  ' + publicOrigin() + '   <- used in emailed links');
  }
  console.log('  local:   http://localhost:' + PORT);
  for (const ip of lan) console.log('  network: http://' + ip + ':' + PORT + '   <- any device on the same WiFi');
  console.log('  accounts: ' + db.users.length + ' user(s), ' + Object.keys(db.sessions).length + ' active session(s)');
  console.log('  db file: ' + DB_FILE);

  /* Loud, early warnings — both of these silently ruin a deploy, and both
     are invisible until an account is gone. */
  if (!process.env.RESEND_API_KEY) {
    console.log('\n  NOTE: RESEND_API_KEY is not set — verification/reset emails are\n' +
      '        printed to this console and returned in the API response for LOOPBACK\n' +
      '        callers only (remote callers never receive the link).');
    if (allowDevLinks({ socket: {} })) {
      console.log('        DEV_MAIL_LINKS is forcing links on for everyone — do NOT do this\n' +
      '        on a public server: it hands out working password-reset links.');
    }
  }
  if (!process.env.PUBLIC_ORIGIN) {
    console.log('  NOTE: PUBLIC_ORIGIN is not set — emailed links will point at localhost.');
  }
  if (!process.env.DATA_DIR) {
    console.log('  NOTE: DATA_DIR is not set — accounts live in ./data next to the code.\n' +
      '        On a host with an ephemeral filesystem every deploy WIPES them.\n' +
      '        Mount a disk and set DATA_DIR, or accept losing accounts on deploy.');
  }
  if (COOKIE_SECURE) console.log('  cookies: Secure (HTTPS only)');
  console.log('');
});