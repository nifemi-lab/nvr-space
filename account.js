// NVR Space — account area (DESIGN.md §5.9): header avatar menu, demo
// sign-in (multiple people on one device), per-person watch history and
// the Settings page wiring. Static demo: everything lives in
// localStorage / sessionStorage — no servers, no real passwords.
(function () {
    'use strict';

    /* ---------- helpers ---------- */
    function $(sel, root) { return (root || document).querySelector(sel); }
    function $$(sel, root) { return Array.prototype.slice.call((root || document).querySelectorAll(sel)); }
    function esc(s) {
        return String(s).replace(/[&<>"]/g, function (c) {
            return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c];
        });
    }
    function toast(msg) { if (window.nvrToast) window.nvrToast(msg); }

    /* ---------- icons (24px, fill: currentColor) ---------- */
    var I = {
        person: '<svg viewBox="0 0 24 24" aria-hidden="true"><path fill-rule="evenodd" d="M12 3a4.5 4.5 0 110 9 4.5 4.5 0 010-9zm0 11c4.4 0 8 2.2 8 5v1H4v-1c0-2.8 3.6-5 8-5z"/></svg>',
        clock: '<svg viewBox="0 0 24 24" aria-hidden="true"><path fill-rule="evenodd" d="M12 2a10 10 0 100 20 10 10 0 000-20zm1 5v5.2l4 2.4-1 1.6-5-3V7z"/></svg>',
        gear: '<svg viewBox="0 0 24 24" aria-hidden="true"><path fill-rule="evenodd" d="M19.14 12.94c.04-.3.06-.61.06-.94s-.02-.64-.07-.94l2.03-1.58a.49.49 0 00.12-.61l-1.92-3.32a.49.49 0 00-.59-.22l-2.39.96c-.5-.38-1.03-.7-1.62-.94l-.36-2.54a.49.49 0 00-.48-.41h-3.84c-.24 0-.43.17-.47.41l-.36 2.54c-.59.24-1.13.57-1.62.94l-2.39-.96a.49.49 0 00-.59.22L2.74 8.87a.49.49 0 00.12.61l2.03 1.58c-.05.3-.09.63-.09.94s.02.64.07.94l-2.03 1.58a.49.49 0 00-.12.61l1.92 3.32c.12.22.37.29.59.22l2.39-.96c.5.38 1.03.7 1.62.94l.36 2.54c.05.24.24.41.48.41h3.84c.24 0 .44-.17.47-.41l.36-2.54c.59-.24 1.13-.56 1.62-.94l2.39.96c.22.08.47 0 .59-.22l1.92-3.32c.12-.22.07-.47-.12-.61l-2.01-1.58zM12 15.6a3.6 3.6 0 110-7.2 3.6 3.6 0 010 7.2z"/></svg>',
        moon: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/></svg>',
        swap: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M7 7h10v3l4-4-4-4v3H5v6h2V7zm10 10H7v-3l-4 4 4 4v-3h12v-6h-2v4z"/></svg>',
        signout: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M17 7l-1.41 1.41L18.17 11H8v2h10.17l-2.58 2.58L17 17l5-5zM4 5h8V3H4c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h8v-2H4V5z"/></svg>',
        signin: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M10 3H4c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h6v-2H4V5h6V3zm12 7l-4-4v3H8v2h10v3l4-4z"/></svg>',
        plus: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M19 13h-6v6h-2v-6H5v-2h6V5h2v6h6z"/></svg>',
        check: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z"/></svg>',
        close: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z"/></svg>',
        trash: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M6 19c0 1.1.9 2 2 2h8c1.1 0 2-.9 2-2V7H6v12zM19 4h-3.5l-1-1h-5l-1 1H5v2h14V4z"/></svg>'
    };

    /* ---------- state ---------- */
    var KEY = 'nvr.account';
    var GUEST_ID = 'acc_guest';

    function defaultPrefs() { return { autoplay: true, dataSaver: false, personalized: true }; }

    function freshState() {
        return {
            v: 1,
            current: 'acc_owner',
            signedIn: true,
            accounts: {
                acc_owner: {
                    id: 'acc_owner', name: 'Nifemi', handle: '@nifemi',
                    avatar: 'img/channels4_profile.jpg', hidden: false,
                    history: [], prefs: defaultPrefs()
                },
                acc_guest: {
                    id: GUEST_ID, name: 'Guest', handle: '@guest',
                    avatar: null, hidden: true,
                    history: [], prefs: defaultPrefs()
                }
            }
        };
    }

    function load() {
        try {
            var s = JSON.parse(localStorage.getItem(KEY));
            if (s && s.v === 1 && s.accounts && s.current) return s;
        } catch (e) { /* fall through to fresh */ }
        return freshState();
    }

    var state = load();
    if (!state.accounts[GUEST_ID]) {
        state.accounts[GUEST_ID] = {
            id: GUEST_ID, name: 'Guest', handle: '@guest',
            avatar: null, hidden: true, history: [], prefs: defaultPrefs()
        };
    }

    function save() { try { localStorage.setItem(KEY, JSON.stringify(state)); } catch (e) { /* private mode */ } }

    function ensure(a) {
        if (!a) return null;
        a.history = a.history || [];
        a.prefs = a.prefs || defaultPrefs();
        return a;
    }
    function acct() { return ensure(state.accounts[state.current]) || ensure(state.accounts[GUEST_ID]); }

    /* ---------- server account layer (real sign-in, cross-device) ----------
       When the page is served by server.js the API is reachable and accounts
       live on the server, so signing in on a phone sees the same account and
       the same watch history as a laptop. If the API is missing (page opened
       as a plain file, or served by the static python server) every call fails
       silently and the app falls back to the local demo accounts. */
    var remote = { online: false, user: null };

    function api(path, method, body) {
        return fetch('/api' + path, {
            method: method || 'GET',
            headers: body ? { 'Content-Type': 'application/json' } : undefined,
            body: body ? JSON.stringify(body) : undefined,
            credentials: 'same-origin',
        }).then(function (r) {
            return r.json().catch(function () { return {}; }).then(function (j) {
                return { status: r.status, ok: r.ok, json: j || {} };
            });
        }).catch(function () { return { status: 0, ok: false, json: {} }; });
    }

    /* pull the signed-in profile + history into local state so the existing
       menu / settings / history rendering works unchanged */
    function adoptRemote(user, history) {
        remote.user = user;
        state.accounts[user.id] = {
            id: user.id,
            name: user.name,
            handle: user.handle,
            avatar: null,
            hidden: false,
            email: user.email,
            remote: true,
            verified: !!user.verified,
            history: history || [],
            prefs: user.prefs || defaultPrefs(),
        };
        state.current = user.id;
        state.signedIn = true;
        save();
    }

    function dropRemote() {
        if (remote.user) delete state.accounts[remote.user.id];
        remote.user = null;
        state.signedIn = false;
        state.current = GUEST_ID;
        save();
    }

    /* history/prefs writes are debounced so a burst of watches is one request.
   A write can land before the /api/me probe has answered (watch.html records
   during page init), so it is parked in historyDirty and flushed once the
   session is known. */
    var historyPushTimer = null;
    var historyDirty = false;
    function pushHistory() {
        if (!remote.user) { historyDirty = true; return; }
        historyDirty = false;
        clearTimeout(historyPushTimer);
        historyPushTimer = setTimeout(function () {
            api('/history', 'PUT', { items: acct().history });
        }, 400);
    }
    function pushPrefs() {
        if (!remote.user) return;
        api('/prefs', 'PUT', acct().prefs);
    }

    function detectBackend() {
        return api('/me', 'GET').then(function (r) {
            /* The API answers 200 for both signed in and signed out (user is
               null when signed out), so any 200 proves the backend is here.
               Anything else means we're on the plain static server. */
            if (r.status !== 200) return;
            remote.online = true;
            if (r.json.user) {
                /* keep whatever was watched before the probe answered, then
                   merge it with the server list so the newest watch isn't lost */
                var localHist = acct() && acct().history ? acct().history.slice() : [];
                adoptRemote(r.json.user, r.json.history || []);
                if (localHist.length) {
                    var merged = localHist.slice();
                    (r.json.history || []).forEach(function (h) {
                        var dup = false;
                        for (var i = 0; i < merged.length; i++) {
                            if (merged[i].title === h.title) { dup = true; break; }
                        }
                        if (!dup) merged.push(h);
                    });
                    merged.sort(function (a, b) { return (b.ts || 0) - (a.ts || 0); });
                    if (merged.length > 200) merged.length = 200;
                    acct().history = merged;
                    save();
                }
                if (historyDirty || localHist.length) pushHistory();
                return;
            }
            /* The server is the source of truth once it's reachable. The local
               "Nifemi" demo owner only exists so the offline demo has somebody
               signed in, so on a real server a fresh visitor must read as
               signed OUT — otherwise the menu offers "Sign out" to someone who
               never signed in. An account the visitor explicitly picked through
               the demo dialog is left alone. */
            var cur = state.accounts[state.current];
            if (!cur || (!cur.remote && !cur.demoPicked)) {
                state.current = GUEST_ID;
                state.signedIn = false;
                save();
            }
        });
    }

    /* ---------- avatars ---------- */
    var GRADS = [
        'linear-gradient(135deg, #7b9cff, #64f0c7)',
        'linear-gradient(135deg, #64f0c7, #4f6ef7)',
        'linear-gradient(135deg, #4f6ef7, #7b9cff)',
        'linear-gradient(135deg, #7b9cff, #4f6ef7)'
    ];
    function gradFor(name) {
        var h = 0;
        name = String(name || '?');
        for (var i = 0; i < name.length; i++) h = (h * 31 + name.charCodeAt(i)) >>> 0;
        return GRADS[h % GRADS.length];
    }
    function avatarHtml(a) {
        if (a.avatar) return '<img src="' + a.avatar + '" alt="">';
        return '<span class="avatar-initial" style="background:' + gradFor(a.name) + '">' +
            esc((a.name || '?').charAt(0).toUpperCase()) + '</span>';
    }
    function guestAvatarHtml() {
        return '<span class="avatar-guest">' + I.person + '</span>';
    }
    function headerAvatarHtml() {
        return state.signedIn ? avatarHtml(acct()) : guestAvatarHtml();
    }
    function renderHeaderAvatar() {
        $$('.avatar-btn').forEach(function (btn) {
            btn.innerHTML = headerAvatarHtml();
            btn.setAttribute('aria-haspopup', 'true');
            btn.setAttribute('aria-expanded', menuOpen ? 'true' : 'false');
        });
    }

    /* ---------- avatar menu ---------- */
    var avatarBtn = $('.avatar-btn');
    var menuEl = null;
    var menuOpen = false;

    function menuHtml() {
        var a = acct();
        var signed = state.signedIn;
        var sub = a.remote
            ? (a.email || 'Synced to your account')
            : (signed ? ' · NVR Space account' : 'Watch history saves to this device');
        var head = signed
            ? '<div class="menu-head"><span class="menu-avatar">' + avatarHtml(a) + '</span>' +
              '<div class="menu-id"><p class="menu-name">' + esc(a.name) + '</p>' +
              '<p class="menu-handle">' + esc(sub) + '</p></div></div>'
            : '<div class="menu-head"><span class="menu-avatar">' + guestAvatarHtml() + '</span>' +
              '<div class="menu-id"><p class="menu-name">Not signed in</p>' +
              '<p class="menu-handle">Watch history saves to this device</p></div></div>';
        var theme = document.documentElement.getAttribute('data-theme') === 'light' ? 'Light' : 'Dark';
        var bottom = signed
            ? '<div class="menu-sep"></div>' +
              '<button class="menu-item" type="button" data-act="switch">' + I.swap + '<span>Switch account</span></button>' +
              '<button class="menu-item" type="button" data-act="signout">' + I.signout + '<span>Sign out</span></button>'
            : '<div class="menu-sep"></div>' +
              '<div class="menu-cta"><button class="btn-accent" type="button" data-act="' +
              (remote.online ? 'auth' : 'signin') + '">' +
              I.signin + ' Sign in</button></div>' +
              (remote.online
                  ? '<p class="menu-note">One account, every device</p>'
                  : '');
        return head +
            '<div class="menu-sep"></div>' +
            '<a class="menu-item" href="profile.html">' + I.person + '<span>Your channel</span></a>' +
            '<a class="menu-item" href="settings.html#history">' + I.clock + '<span>History</span></a>' +
            '<a class="menu-item" href="settings.html">' + I.gear + '<span>Settings</span></a>' +
            '<button class="menu-item" type="button" data-act="theme">' + I.moon +
            '<span>Appearance</span><b class="menu-value" data-theme-label>' + theme + '</b></button>' +
            bottom;
    }

    function openMenu() {
        if (!avatarBtn) return;
        if (!menuEl) {
            menuEl = document.createElement('div');
            menuEl.className = 'account-menu';
            menuEl.id = 'account-menu';
            menuEl.setAttribute('role', 'menu');
            menuEl.setAttribute('aria-label', 'Account menu');
            document.body.appendChild(menuEl);
        }
        menuEl.innerHTML = menuHtml();
        menuEl.hidden = false;
        menuOpen = true;
        avatarBtn.setAttribute('aria-expanded', 'true');
        var first = menuEl.querySelector('.menu-item');
        if (first) first.focus();
    }

    function closeMenu() {
        if (!menuEl || !menuOpen) return;
        menuEl.hidden = true;
        menuOpen = false;
        if (avatarBtn) avatarBtn.setAttribute('aria-expanded', 'false');
    }

    if (avatarBtn) {
        avatarBtn.addEventListener('click', function (e) {
            e.stopPropagation();
            if (menuOpen) closeMenu(); else openMenu();
        });
    }

    document.addEventListener('mousedown', function (e) {
        if (!menuOpen) return;
        if (menuEl && menuEl.contains(e.target)) return;
        if (avatarBtn && avatarBtn.contains(e.target)) return;
        closeMenu();
    });
    document.addEventListener('keydown', function (e) {
        if (e.key !== 'Escape') return;
        if (modalRoot) { closeModal(); return; }
        closeMenu();
    });

    /* ---------- sign-in / switch-account dialog ---------- */
    var modalRoot = null;
    var lastFocus = null;

    function switchHtml() {
        var rows = Object.keys(state.accounts).map(function (id) {
            var a = ensure(state.accounts[id]);
            if (!a || a.hidden) return '';
            var cur = state.signedIn && id === state.current;
            return '<button class="acct-row" type="button" data-pick="' + id + '">' +
                '<span class="acct-avatar">' + avatarHtml(a) + '</span>' +
                '<span class="acct-row-text"><span class="acct-name">' + esc(a.name) + '</span>' +
                '<span class="acct-handle">' + esc(a.handle) + (cur ? ' · Signed in' : '') + '</span></span>' +
                (cur ? '<span class="acct-current" aria-hidden="true">' + I.check + '</span>' : '') +
                '</button>';
        }).join('');
        return '<div class="acct-dialog" role="dialog" aria-modal="true" aria-labelledby="acct-title">' +
            '<button class="overlay-close acct-close" type="button" aria-label="Close">' + I.close + '</button>' +
            '<h2 class="acct-title" id="acct-title">Switch account</h2>' +
            '<p class="acct-sub">Every account keeps its own watch history.</p>' +
            '<div class="acct-list">' + rows + '</div>' +
            '<div class="acct-actions"><button class="btn-ghost acct-add" type="button" data-go="signin">' +
            I.plus + 'Add account</button></div>' +
            '</div>';
    }

    function signinHtml() {
        return '<div class="acct-dialog" role="dialog" aria-modal="true" aria-labelledby="acct-title">' +
            '<button class="overlay-close acct-close" type="button" aria-label="Close">' + I.close + '</button>' +
            '<h2 class="acct-title" id="acct-title">Sign in to NVR Space</h2>' +
            '<p class="acct-sub">Pick a display name — this is a demo, no password needed. ' +
            'Your watch history stays on this device.</p>' +
            '<form class="acct-form" novalidate>' +
            '<label class="acct-label" for="acct-name">Display name</label>' +
            '<input class="acct-input" id="acct-name" name="name" type="text" maxlength="24" ' +
            'autocomplete="off" placeholder="e.g. Ada" required>' +
            '<div class="acct-preview"><span class="acct-avatar" id="acct-preview-av"></span>' +
            '<div><p class="acct-name" id="acct-preview-name">Your name</p>' +
            '<p class="acct-handle" id="acct-preview-handle">@yourname</p></div></div>' +
            '<div class="acct-actions"><button class="btn-ghost" type="button" data-go="switch">Cancel</button>' +
            '<button class="btn-accent" type="submit" id="acct-submit" disabled>Sign in</button></div>' +
            '</form></div>';
    }

    function handleFor(name) {
        var slug = name.toLowerCase().replace(/[^a-z0-9]+/g, '');
        return '@' + (slug || 'user');
    }

    function signIn(rawName) {
        var name = String(rawName || '').trim().slice(0, 24);
        if (!name) return;
        var found = null;
        Object.keys(state.accounts).forEach(function (id) {
            var a = state.accounts[id];
            if (!a.hidden && a.name.toLowerCase() === name.toLowerCase()) found = a;
        });
        if (found) {
            state.current = found.id;
        } else {
            var id = 'acc_' + Date.now();
            state.accounts[id] = {
                id: id, name: name, handle: handleFor(name),
                avatar: null, hidden: false, demoPicked: true,
                history: [], prefs: defaultPrefs()
            };
            state.current = id;
        }
        state.signedIn = true;
        save();
        refreshAll();
        toast('Signed in as ' + name);
    }

    function signOut() {
        /* a server session must be revoked, not just forgotten locally —
           otherwise the cookie keeps working in this browser */
        if (remote.user) {
            dropRemote();
            api('/logout', 'POST').then(function () { refreshAll(); });
            toast('Signed out');
            return;
        }
        state.current = GUEST_ID;
        state.signedIn = false;
        save();
        refreshAll();
        toast('Signed out — browsing as Guest');
    }

    function switchTo(id) {
        if (!state.accounts[id]) return;
        if (!state.accounts[id].remote) state.accounts[id].demoPicked = true;
        state.current = id;
        state.signedIn = true;
        save();
        refreshAll();
        toast('Switched to ' + state.accounts[id].name);
    }

    function renderDialog(view) {
        if (!modalRoot) return;
        var old = modalRoot.querySelector('.acct-dialog');
        if (old) old.remove();
        modalRoot.insertAdjacentHTML('beforeend',
            view === 'signin' ? signinHtml()
                : view === 'auth' ? authHtml()
                    : view === 'forgot' ? forgotHtml()
                        : switchHtml());
        wireDialog(view);
    }

    function wireDialog(view) {
        var dialog = modalRoot.querySelector('.acct-dialog');
        if (!dialog) return;
        var closeBtn = dialog.querySelector('.acct-close');
        if (closeBtn) closeBtn.addEventListener('click', closeModal);

        $$('[data-go]', dialog).forEach(function (b) {
            b.addEventListener('click', function () { renderDialog(b.getAttribute('data-go')); });
        });
        $$('[data-pick]', dialog).forEach(function (b) {
            b.addEventListener('click', function () {
                switchTo(b.getAttribute('data-pick'));
                closeModal();
            });
        });

        if (view === 'auth') {
            wireAuth();
            return;
        }

        if (view === 'forgot') {
            wireForgot();
            return;
        }

        if (view === 'signin') {
            var form = dialog.querySelector('.acct-form');
            var input = dialog.querySelector('#acct-name');
            var submit = dialog.querySelector('#acct-submit');
            var pAv = dialog.querySelector('#acct-preview-av');
            var pName = dialog.querySelector('#acct-preview-name');
            var pHandle = dialog.querySelector('#acct-preview-handle');
            function syncPreview() {
                var v = input.value.trim();
                pAv.innerHTML = v
                    ? '<span class="avatar-initial" style="background:' + gradFor(v) + '">' + esc(v.charAt(0).toUpperCase()) + '</span>'
                    : guestAvatarHtml();
                pName.textContent = v || 'Your name';
                pHandle.textContent = v ? handleFor(v) : '@yourname';
                submit.disabled = !v;
            }
            input.addEventListener('input', syncPreview);
            syncPreview();
            form.addEventListener('submit', function (e) {
                e.preventDefault();
                if (submit.disabled) return;
                signIn(input.value);
                closeModal();
            });
            input.focus();
        } else {
            var firstRow = dialog.querySelector('.acct-row');
            (firstRow || closeBtn || dialog).focus();
        }
    }

    function openAcctModal(view, trigger) {
        lastFocus = trigger || document.activeElement;
        closeMenu();
        if (modalRoot) { renderDialog(view); return; }
        modalRoot = document.createElement('div');
        modalRoot.className = 'acct-root';
        modalRoot.innerHTML = '<div class="acct-backdrop"></div>';
        document.body.appendChild(modalRoot);
        document.body.classList.add('acct-dialog-open');
        modalRoot.querySelector('.acct-backdrop').addEventListener('click', closeModal);
        renderDialog(view);
    }

    function closeModal() {
        if (!modalRoot) return;
        modalRoot.remove();
        modalRoot = null;
        document.body.classList.remove('acct-dialog-open');
        if (lastFocus && lastFocus.focus) { try { lastFocus.focus(); } catch (e) { /* gone */ } }
        lastFocus = null;
    }

    /* ---------- menu actions ---------- */
    if (menuEl) { /* assigned above */ }
    document.addEventListener('click', function (e) {
        var t = e.target;
        if (!t.closest) return;

        /* menu rows (works before menuEl exists too — delegation on document) */
        var item = t.closest('#account-menu [data-act]');
        if (item) {
            var act = item.getAttribute('data-act');
            if (act === 'theme') {
                var tb = document.getElementById('theme-btn');
                if (tb) tb.click();
                var lbl = menuEl && menuEl.querySelector('[data-theme-label]');
                if (lbl) lbl.textContent = document.documentElement.getAttribute('data-theme') === 'light' ? 'Light' : 'Dark';
                renderSettings();
            } else if (act === 'switch') {
                openAcctModal('switch', avatarBtn);
            } else if (act === 'auth') {
                closeMenu();
                openAcctModal('auth', avatarBtn);
            } else if (act === 'signin') {
                openAcctModal('signin', avatarBtn);
            } else if (act === 'signout') {
                closeMenu();
                signOut();
            }
            return;
        }

        /* settings-page account buttons */
        var sAct = t.closest('[data-acct-act]');
        if (sAct) {
            var sa = sAct.getAttribute('data-acct-act');
            if (sa === 'switch') openAcctModal('switch', sAct);
            else if (sa === 'signin') openAcctModal(remote.online ? 'auth' : 'signin', sAct);
            else if (sa === 'signout') signOut();
        }
    });

    /* ---------- watch-history recording ---------- */
    /* remember which video was clicked (feed card or up-next rail) … */
    document.addEventListener('click', function (e) {
        var t = e.target;
        if (!t.closest) return;
        var card = t.closest('.post-card[data-href="watch.html"], .upnext-card');
        if (!card) return;
        var titleEl = card.querySelector('.post-title') || card.querySelector('.upnext-title');
        if (!titleEl) return;
        var metaEl = card.querySelector('.post-meta') || card.querySelector('.upnext-sub');
        var thumbEl = card.querySelector('.post-media img') || card.querySelector('.upnext-thumb img');
        try {
            sessionStorage.setItem('nvr.last', JSON.stringify({
                title: titleEl.textContent.trim(),
                channel: metaEl ? metaEl.textContent.split('·')[0].trim() : '',
                thumb: thumbEl ? thumbEl.getAttribute('src') : '',
                ts: Date.now()
            }));
        } catch (e2) { /* storage off */ }
    }, true);

    function addHistory(item) {
        var a = acct();
        a.history = a.history.filter(function (h) { return h.title !== item.title; });
        a.history.unshift({
            title: item.title,
            channel: item.channel || '',
            thumb: item.thumb || '',
            ts: Date.now()
        });
        if (a.history.length > 200) a.history.length = 200;
        save();
        pushHistory(); /* mirror to the server so other devices see it */
    }

    /* … then save it when the watch page actually opens */
    var watchTitle = document.getElementById('watch-title');
    if (watchTitle) {
        var item = null;
        try {
            var raw = sessionStorage.getItem('nvr.last');
            sessionStorage.removeItem('nvr.last');
            if (raw) {
                var parsed = JSON.parse(raw);
                if (parsed && parsed.title && Date.now() - (parsed.ts || 0) < 120000) item = parsed;
            }
        } catch (e) { /* ignore */ }
        if (!item) {
            var chanEl = $('.watch-info .channel-name');
            var vid = document.getElementById('watch-video');
            item = {
                title: watchTitle.textContent.trim(),
                channel: chanEl ? chanEl.textContent.trim() : '',
                thumb: (vid && vid.getAttribute('poster')) || 'img/image_1.jpg'
            };
        }
        addHistory(item);
    }

    /* ---------- settings page ---------- */
    function timeAgo(ts) {
        var s = Math.max(1, Math.floor((Date.now() - ts) / 1000));
        if (s < 60) return 'just now';
        if (s < 3600) { var m = Math.floor(s / 60); return m + ' minute' + (m > 1 ? 's' : '') + ' ago'; }
        if (s < 86400) { var h = Math.floor(s / 3600); return h + ' hour' + (h > 1 ? 's' : '') + ' ago'; }
        var d = Math.floor(s / 86400);
        if (d === 1) return 'yesterday';
        if (d < 7) return d + ' days ago';
        return new Date(ts).toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
    }

    var armTimer = null;

    function renderHistory() {
        var list = document.getElementById('hist-list');
        if (!list) return;
        var a = acct();
        var empty = document.getElementById('hist-empty');
        var clearBtn = document.getElementById('hist-clear');
        if (empty) empty.hidden = a.history.length > 0;
        if (clearBtn) {
            clearBtn.hidden = a.history.length === 0;
            clearBtn.classList.remove('armed');
            clearBtn.textContent = 'Clear all';
        }
        list.innerHTML = a.history.map(function (h, i) {
            var thumb = h.thumb
                ? '<img class="hist-thumb" src="' + esc(h.thumb) + '" alt="">'
                : '<span class="hist-thumb hist-thumb-ph" style="background:' + gradFor(h.title) + '" aria-hidden="true"></span>';
            return '<div class="hist-row">' + thumb +
                '<div class="hist-text"><p class="hist-title">' + esc(h.title) + '</p>' +
                '<p class="hist-meta">' + esc(h.channel || 'Unknown channel') +
                ' · Watched ' + timeAgo(h.ts) + '</p></div>' +
                '<button class="icon-btn hist-remove" type="button" data-remove="' + i + '" ' +
                'aria-label="Remove ' + esc(h.title) + ' from watch history">' + I.trash + '</button>' +
                '</div>';
        }).join('');
    }

    function renderSettings() {
        var page = document.getElementById('settings-page');
        if (!page) return;
        var a = acct();

        var av = document.getElementById('set-avatar');
        if (av) av.innerHTML = state.signedIn ? avatarHtml(a) : guestAvatarHtml();
        setText('set-name', state.signedIn ? a.name : 'Guest');
        setText('set-handle', state.signedIn ? a.handle + ' · NVR Space account' : 'Not signed in');
        setText('set-email', state.signedIn
            ? (a.email || a.name.toLowerCase().replace(/[^a-z0-9]+/g, '.') + '@nvrspace.app')
            : 'Watching on this device');

        /* the storage note must match reality: a server account is NOT
           "this browser only" */
        setText('set-note',
            a.remote
                ? 'Your account, watch history and preferences are stored on the server, so they follow you to any device you sign in from.'
                : 'Without an account everything stays in this browser only — nothing is uploaded.');

        /* unverified nag: sign-in still works, we just ask nicely */
        var vBanner = document.getElementById('verify-banner');
        if (vBanner) {
            var needVerify = state.signedIn && a.remote && a.verified === false;
            vBanner.hidden = !needVerify;
            if (needVerify) {
                var vNote = document.getElementById('verify-note');
                if (vNote) vNote.textContent = 'Confirm ' + (a.email || 'your email') + ' to secure your account.';
            }
        }

        var signInBtn = document.getElementById('set-signin');
        var signOutBtn = document.getElementById('set-signout');
        var switchBtn = document.getElementById('set-switch');
        if (signInBtn) signInBtn.hidden = state.signedIn;
        if (signOutBtn) signOutBtn.hidden = !state.signedIn;
        if (switchBtn) switchBtn.hidden = !state.signedIn;

        var theme = document.documentElement.getAttribute('data-theme') || 'dark';
        $$('.seg-btn', page).forEach(function (b) {
            b.classList.toggle('on', b.getAttribute('data-theme-pick') === theme);
            b.setAttribute('aria-pressed', String(b.getAttribute('data-theme-pick') === theme));
        });

        $$('[data-pref]', page).forEach(function (inp) {
            inp.checked = !!a.prefs[inp.getAttribute('data-pref')];
        });

        renderHistory();
    }

    function setText(id, txt) {
        var el = document.getElementById(id);
        if (el) el.textContent = txt;
    }

    /* settings page wiring (only present on settings.html) */
    (function wireSettings() {
        var page = document.getElementById('settings-page');
        if (!page) return;

        $$('.seg-btn', page).forEach(function (b) {
            b.addEventListener('click', function () {
                var target = b.getAttribute('data-theme-pick');
                if (document.documentElement.getAttribute('data-theme') === target) return;
                var tb = document.getElementById('theme-btn');
                if (tb) tb.click();
                else {
                    document.documentElement.setAttribute('data-theme', target);
                    try { localStorage.setItem('theme', target); } catch (e) { /* ignore */ }
                }
                renderSettings();
            });
        });

        page.addEventListener('change', function (e) {
            var inp = e.target;
            if (!inp.getAttribute) return;
            var pref = inp.getAttribute('data-pref');
            if (!pref) return;
            acct().prefs[pref] = !!inp.checked;
            save();
            pushPrefs();
        });

        var list = document.getElementById('hist-list');
        if (list) {
            list.addEventListener('click', function (e) {
                var btn = e.target.closest('[data-remove]');
                if (!btn) return;
                var idx = parseInt(btn.getAttribute('data-remove'), 10);
                var a = acct();
                if (isNaN(idx) || !a.history[idx]) return;
                a.history.splice(idx, 1);
                save();
                pushHistory();
                renderHistory();
                toast('Removed from watch history');
            });
        }

        var clearBtn = document.getElementById('hist-clear');
        if (clearBtn) {
            clearBtn.addEventListener('click', function () {
                if (!clearBtn.classList.contains('armed')) {
                    clearBtn.classList.add('armed');
                    clearBtn.textContent = 'Click again to confirm';
                    clearTimeout(armTimer);
                    armTimer = setTimeout(function () {
                        clearBtn.classList.remove('armed');
                        clearBtn.textContent = 'Clear all';
                    }, 3000);
                    return;
                }
                clearTimeout(armTimer);
                acct().history = [];
                save();
                pushHistory();
                renderHistory();
                toast('Watch history cleared');
            });
        }
    })();

    function refreshAll() {
        renderHeaderAvatar();
        if (menuOpen && menuEl) menuEl.innerHTML = menuHtml();
        renderSettings();
    }

    /* ---------- real sign-in / create-account dialog ----------
       Used when the server API is reachable. Tabbed: sign in to an existing
       account, or create a new one. Both post to /api and land a session
       cookie, which is what makes the account follow the person to any
       device that can reach this server. */
    var authMode = 'login';

    function authHtml() {
        var creating = authMode === 'register';
        return '<div class="acct-dialog acct-auth" role="dialog" aria-modal="true" aria-labelledby="acct-title">' +
            '<button class="overlay-close acct-close" type="button" aria-label="Close">' + I.close + '</button>' +
            '<h2 class="acct-title" id="acct-title">' + (creating ? 'Create your account' : 'Sign in to NVR Space') + '</h2>' +
            '<p class="acct-sub">' + (creating
                ? 'One account works on every device you sign in from — your watch history comes with you.'
                : 'Sign in from any device to pick up your watch history where you left off.') + '</p>' +
            '<div class="auth-tabs" role="tablist">' +
            '<button class="auth-tab' + (creating ? '' : ' on') + '" type="button" data-auth-mode="login" role="tab">Sign in</button>' +
            '<button class="auth-tab' + (creating ? ' on' : '') + '" type="button" data-auth-mode="register" role="tab">Create account</button>' +
            '</div>' +
            '<form class="acct-form" novalidate>' +
            (creating
                ? '<label class="acct-label" for="auth-name">Display name</label>' +
                  '<input class="acct-input" id="auth-name" name="name" type="text" maxlength="24" autocomplete="name" placeholder="e.g. Ada">'
                : '') +
            '<label class="acct-label" for="auth-email">Email</label>' +
            '<input class="acct-input" id="auth-email" name="email" type="email" maxlength="160" autocomplete="email" placeholder="you@example.com">' +
            '<label class="acct-label" for="auth-password">Password</label>' +
            '<input class="acct-input" id="auth-password" name="password" type="password" autocomplete="' + (creating ? 'new-password' : 'current-password') + '" placeholder="' + (creating ? 'At least 8 characters' : 'Your password') + '">' +
            '<p class="auth-error" id="auth-error" role="alert" hidden></p>' +
            '<div class="acct-actions">' +
            '<button class="btn-ghost" type="button" data-go="switch">Cancel</button>' +
            '<button class="btn-accent" type="submit" id="auth-submit">' + (creating ? 'Create account' : 'Sign in') + '</button>' +
            '</div>' +
            '</form>' +
            (creating ? '' : '<p class="auth-forgot"><button class="auth-link" type="button" data-go="forgot">Forgot your password?</button></p>') +
            '<div class="auth-alt">' +
            '<button class="auth-guest" type="button" data-go="signin">Continue without an account</button>' +
            '<p class="auth-note">Without an account your history stays on this device only.</p>' +
            '</div>' +
            '</div>';
    }

    /* forgot-password view: asks only for the email, then tells the user to
       check their inbox. Never reveals whether the address has an account. */
    function forgotHtml() {
        return '<div class="acct-dialog acct-forgot" role="dialog" aria-modal="true" aria-labelledby="acct-title">' +
            '<button class="overlay-close acct-close" type="button" aria-label="Close">' + I.close + '</button>' +
            '<h2 class="acct-title" id="acct-title">Reset your password</h2>' +
            '<p class="acct-sub">Enter your email and we\'ll send you a link to choose a new one.</p>' +
            '<form class="acct-form" novalidate>' +
            '<label class="acct-label" for="forgot-email">Email</label>' +
            '<input class="acct-input" id="forgot-email" name="email" type="email" maxlength="160" autocomplete="email" placeholder="you@example.com">' +
            '<p class="auth-error" id="auth-error" role="alert" hidden></p>' +
            '<div class="acct-actions">' +
            '<button class="btn-ghost" type="button" data-go="auth">Back</button>' +
            '<button class="btn-accent" type="submit" id="forgot-submit">Send reset link</button>' +
            '</div>' +
            '</form>' +
            '<div class="auth-alt"><p class="auth-note" id="forgot-note"></p></div>' +
            '</div>';
    }

    function wireForgot() {
        var dialog = modalRoot && modalRoot.querySelector('.acct-forgot');
        if (!dialog) return;
        var form = dialog.querySelector('.acct-form');
        var err = dialog.querySelector('#auth-error');
        var submit = dialog.querySelector('#forgot-submit');
        var note = dialog.querySelector('#forgot-note');

        form.addEventListener('submit', function (e) {
            e.preventDefault();
            err.hidden = true;
            submit.disabled = true;
            submit.textContent = 'Sending…';
            api('/forgot-password', 'POST', { email: dialog.querySelector('#forgot-email').value.trim() })
                .then(function (r) {
                    form.hidden = true;
                    /* dev mode hands the link back so the flow is testable
                       without a mail provider */
                    note.innerHTML = (r.json && r.json.devMode && r.json.body)
                        ? 'Dev mode — no mail provider configured, so here is the link:<br>' +
                          (String(r.json.body).match(/https?:\/\/\S+/)
                              ? '<a class="auth-link" href="' + esc(String(r.json.body).match(/https?:\/\/\S+/)[0]) + '">Open the reset link</a>'
                              : 'Check the server console for the link.')
                        : esc((r.json && r.json.message) || 'Check your inbox for the link.');
                });
        });

        var input = dialog.querySelector('#forgot-email');
        if (input) input.focus();
    }

    function wireAuth() {
        var dialog = modalRoot && modalRoot.querySelector('.acct-auth');
        if (!dialog) return;

        $$('[data-auth-mode]', dialog).forEach(function (t) {
            t.addEventListener('click', function () {
                authMode = t.getAttribute('data-auth-mode');
                renderDialog('auth');
            });
        });

        var form = dialog.querySelector('.acct-form');
        var err = dialog.querySelector('#auth-error');
        var submit = dialog.querySelector('#auth-submit');

        function fail(msg) {
            err.textContent = msg;
            err.hidden = false;
            submit.disabled = false;
            submit.textContent = authMode === 'register' ? 'Create account' : 'Sign in';
        }

        form.addEventListener('submit', function (e) {
            e.preventDefault();
            err.hidden = true;
            var payload = {
                email: dialog.querySelector('#auth-email').value.trim(),
                password: dialog.querySelector('#auth-password').value,
            };
            if (authMode === 'register') {
                payload.name = (dialog.querySelector('#auth-name') || {}).value || '';
            }
            submit.disabled = true;
            submit.textContent = authMode === 'register' ? 'Creating account…' : 'Signing in…';

            api(authMode === 'register' ? '/register' : '/login', 'POST', payload).then(function (r) {
                if (r.status === 0) {
                    fail('Cannot reach the server. Is it still running?');
                    return;
                }
                if (!r.ok) {
                    fail((r.json && r.json.error) || 'Something went wrong. Try again.');
                    return;
                }
                adoptRemote(r.json.user, r.json.history || []);
                remote.online = true;
                refreshAll();
                closeModal();
                toast(authMode === 'register'
                    ? 'Welcome, ' + r.json.user.name + ' — works on every device'
                    : 'Signed in as ' + r.json.user.name);
            });
        });

        var first = dialog.querySelector('#auth-name') || dialog.querySelector('#auth-email');
        if (first) first.focus();
    }

    /* resend-verification handler lives here so the settings banner and any
       future call site share it */
    (function wireVerify() {
        var btn = document.getElementById('verify-resend');
        if (!btn) return;
        btn.addEventListener('click', function () {
            var note = document.getElementById('verify-note');
            btn.disabled = true;
            btn.textContent = 'Sending…';
            api('/resend-verification', 'POST').then(function (r) {
                btn.disabled = false;
                btn.textContent = 'Resend email';
                if (r.status === 0) { toast('Cannot reach the server'); return; }
                if (r.json && r.json.devMode && r.json.body) {
                    var m = String(r.json.body).match(/https?:\/\/\S+/);
                    if (note && m) {
                        note.innerHTML = 'Dev mode — <a class="auth-link" href="' + esc(m[0]) +
                            '" target="_blank" rel="noopener">open the verification link</a>';
                    }
                    return;
                }
                toast('Verification email sent — check your inbox');
            });
        });
    })();

    /* ---------- boot ---------- */
    /* header theme toggle also flips the settings page's segmented control */
    document.addEventListener('click', function (e) {
        var t = e.target;
        if (t && t.closest && t.closest('#theme-btn')) {
            setTimeout(renderSettings, 0);
        }
    });

    renderHeaderAvatar();
    renderSettings();

    /* ask the server who we are; if it answers, real accounts are available */
    detectBackend().then(function () {
        refreshAll();
    });

})();
