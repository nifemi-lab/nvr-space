# NVR Space — Design Document
### A social video platform combining YouTube, Instagram, TikTok & X
**Version:** 1.1 | **Status:** Design approved for build | **Base project:** youtube.com.copy
**Changelog 1.1 (2026-10-01):** Account area — header avatar menu, demo sign-in for multiple people, per-person watch history, settings.html (Account, Appearance, Watch history, Playback & data, About), starfield on menu items & segmented buttons. QA: 8 pages × 4 widths × 2 themes = 64/64 pass.

---

## 1. Concept

Every piece of content — long video, short, photo set, or text post — is a **Post**.
One feed, one set of actions (like, comment, share, save), one app.

- **YouTube** contributes: search-first header, sidebar navigation, watch pages, subscriptions.
- **Instagram** contributes: stories row, profile grids, hearts, photo posts.
- **TikTok** contributes: full-screen vertical swiping shorts, action rail, minimal chrome.
- **X** contributes: text posts, trending topics, repost culture, fast posting.

---

## 2. Design Tokens (global values)

### Colors — Periwinkle / Mint palette (2026-10-02, matched to the portfolio site)
Palette lifted from `Default Project/css/styles.css` so NVR Space and the portfolio read as one family.

| Token | Value (dark) | Value (light) | Use |
|---|---|---|---|
| `--bg` | `#0a0c11` | `#f4f6fb` | Page background |
| `--surface` | `#11141c` | `#ffffff` | Cards, menus, panels |
| `--surface-2` | `#171b25` | `#eaeef7` | Hovered/raised cards, inputs |
| `--line` | `#232838` | `#d3daea` | Borders, dividers |
| `--text` | `#e9ecf4` | `#0d1220` | Primary text |
| `--muted` | `#a3adc2` | `#5b6479` | Secondary text, metadata |
| `--accent-grad` | `linear-gradient(135deg, #7b9cff, #64f0c7)` | `linear-gradient(135deg, #5b7cfa, #0ea88f)` | Stories rings, active states, Create button, segmented pills, subscribe |
| `--accent` | `#7b9cff` | `#4a68e8` | Solid accent (unread dots, solid buttons) |
| `--nebula` | `radial-gradient(120% 120% at 20% 10%, #2b3b6e, #0d1020 70%)` | same | Starfield fill (§7) — stays dark in both themes |
| `--stars` | white / `#7b9cff` / `#64f0c7` tiles | same | Starfield sparkle layer |
| `--link` | `#9ab4ff` | `#3d51c9` | Link/tag text |
| `--like` | `#f43f5e` | `#e11d48` | Liked heart, unread badge, like count |
| `--danger` | `#f87171` | `#dc2626` | Errors, destructive actions |
| `--hover` | `rgba(123,156,255,.12)` | `rgba(74,104,232,.1)` | Surface hover wash |
| `--state` | `rgba(123,156,255,.18)` | `rgba(74,104,232,.12)` | "Already on" chip fill |
| `--spin` | `rgba(123,156,255,.4)` | `rgba(74,104,232,.3)` | Spinner track |
| `--shadow-lg/md/sm` | `rgba(0,0,0,.6/.5/.4)` | `rgba(13,18,32,.2/.14/.1)` | Menus, toast, cards |

**Inline SVG mark:** every page's logo + icon gradients use the same stops — `#7b9cff → #64f0c7 → #4f6ef7` (replaced the old gold/magenta/violet on all 8 pages).

**Theme-aware:** `--bg`, `--surface`, `--surface-2`, `--line`, `--text`, `--muted`, `--link`, `--like`, `--danger`, `--accent`, `--hover`, `--state`, `--spin`, `--shadow-*` all get light values. `--accent-grad`, `--nebula`, `--stars`, radii are identical in both themes.

### 2.1 Theme (dark ⇄ light, added 2026-10-01)
- Stored on `<html data-theme>`; a tiny inline `<head>` script applies it **before first paint** (no flash). First visit follows `prefers-color-scheme`; after that the user's choice wins (`localStorage.theme`).
- Light scale: `--bg #f1f1f1` · `--surface #ffffff` · `--surface-2 #ebebeb` · `--line #dcdcdc` · `--text #0f0f0f` · `--muted #606060` · `--link #0b57d0` · `--like #e11d2e` · `--danger #d32f2f`. `color-scheme` flips too, so native controls/scrollbars follow.
- **The starfield does not re-theme**: `--nebula` and `--stars` stay dark in both themes, so every lit/hover control keeps its white label and white stars (space is space). Verified hover probes identical in light mode.
- `<video>` fallback text is forced `#fff` — it always sits on the element's own black box, so it must not inherit the light `--text`.
- Toggle lives in the header (`ThemeToggle` in §3.1); icon shows the theme you'd switch **to** (sun while dark, moon while light), `aria-label`/`title` stay in sync.
- Verified 2026-10-01 (re-run after the blue restoration): QA 28/28 in **light** + 28/28 in **dark** (0 overflow / JS errors / broken images / unlabeled buttons / small targets / failed resources / leftover skeletons), plus a low-contrast sweep of all 7 pages in **both** themes — the only flag in either was the known gradient false-positive (`.lbl-follow` sits on `--accent-grad`'s pink midpoint = 4.72:1). Earlier the same day the suite also caught black-on-nebula mobile-nav labels before their fix.
- Visual sign-off 2026-10-01: headless-Chrome screenshots via CDP (`Emulation.setEmulatedMedia` for both themes, real `Input.dispatchMouseEvent` hover) — dark home, light home, dark profile, light profile, Create-button starfield hover, 375px mobile — all matching this document.

### Typography (Roboto, already in use)
| Token | Size / Weight | Use |
|---|---|---|
| `title-md` | 16px / 600 | Post titles, card headings |
| `body` | 14px / 400 | Default text |
| `meta` | 13px / 400, `--muted` | Views, timestamps, handles |
| `section-h` | 20px / 700 | Page section headings |
| `hero` | 28px / 800 | Profile name, empty states |

### Spacing scale
`4 / 8 / 12 / 16 / 24 / 32px` — use only these values.

### Shape
| Token | Value | Use |
|---|---|---|
| `radius-sm` | 8px | Buttons, chips, inputs |
| `radius-md` | 12px | Cards, media thumbnails |
| `radius-full` | 50% | Avatars, story circles, icon buttons |

### Breakpoints
| Name | Width | Layout |
|---|---|---|
| `desktop` | ≥ 1200px | Sidebar visible + optional trending panel |
| `tablet` | 768–1199px | Collapsed sidebar (icons only) |
| `mobile` | < 768px | No sidebar, bottom nav bar |

---

## 3. App Shell (every page)

```
┌──────────────────────────────────────────────────────────┐
│ HEADER (56px, sticky, z-50)                              │
├──────────┬─────────────────────────────────┬─────────────┤
│ SIDEBAR  │                                 │ TRENDING    │
│ 240px    │        PAGE CONTENT             │ PANEL       │
│ desktop  │        (max-width 1600px)       │ ≥1600px     │
│ 72px     │                                 │ 320px       │
│ tablet   │                                 │             │
└──────────┴─────────────────────────────────┴─────────────┘
│ MOBILE BOTTOM NAV (64px, mobile only)                    │
└──────────────────────────────────────────────────────────┘
```

### 3.1 Header — height `56px`, padding `0 16px`, background `--bg`, bottom border `1px solid --line`

```
[☰] [LOGO]      [──────── search input ────────][🔍][🎙]      [+ Create] [✉] [🔔³] [☀/☾] [ (avatar) ]
```

| Component | Spec |
|---|---|
| `MenuButton` | 40×40 icon button, toggles sidebar |
| `Logo` | Play-triangle mark + wordmark `NVR Space`, links to Home. Sits in its own 36px / 18px-radius pill (2026-09-30) so the starfield hover matches `CreateButton`. Wordmark colour is explicit `var(--text)` — without it the anchor rendered in the browser's default link blue (the "NVR space blue" the user wanted gone; fixed 2026-10-01) |
| `SearchBar` | Max-width 640px, centered. Input: `--surface-2`, radius-full, height 40px. Search button: 64px wide, `--surface-2` |
| `VoiceButton` | 40×40 circle, `--surface-2` |
| `CreateButton` | Height 36px, radius-full, `--surface-2`, icon + "Create". **Deep-space starfield fill on hover** (changed 2026-09-30: user disliked the original gradient fill — deep-space blue nebula fill `--nebula` (§2) with tiny white/gold/blue stars, white text). This fill is now the shared **starfield language** for controls (§7); the `Logo` was reshaped to the same 36px / 18px-radius pill so its hover reads as the Create button's sibling |
| `MessagesIcon` | 40×40, opens messages panel |
| `NotificationsIcon` | 40×40, red badge with count (top-right of icon) |
| `ThemeToggle` | 40×40 icon button, sun/moon pair (only one visible at a time), flips `data-theme` dark ⇄ light and persists it (§2.1, added 2026-10-01) |
| `Avatar` | 32px circle, opens account menu |

**Header flex sizing (bug fixed 2026-09-30):** `.header-left` = `flex: 1 1 auto; min-width: max-content` and `.header-search` = `min-width: 0`. With the old `flex: 1; min-width: 0` (flex-basis 0) the left group collapsed to **0px between 768–1100px**, so the logo painted on top of the search field; without `min-width: 0` on the search the header overflowed ~9px at exactly 768px. Verified flat (no overlap, no overflow) at 360/375/480/700/767/768/800/900/1100/1300/1600.

### 3.2 Sidebar

**Desktop (240px):** nav items as rows — 24px icon + label, height 40px, radius-sm, **hover = starfield (§7)**, active = label turns `--text` + left accent bar (3px gradient) + lit starfield.

Items: Home, Shorts, Explore, Subscriptions, divider, **Your stuff** (You, Saved, History), divider, Subscribed channels list, divider, Settings.

**Tablet (72px):** icon-only centered column, labels hidden.

**Mobile:** no sidebar; menu button opens a full overlay drawer (280px) with the desktop list + close button.

### 3.3 Trending Panel (desktop ≥1600px, 320px, sticky)

- Heading: "Trending Now" (`section-h`)
- Item: rank number (20px/700, `--muted`), topic title (`body`), post count (`meta`)
- Shows 6–8 topics; "Show more" expands
- Followed by "Who to follow": avatar + name + Follow button (small)

### 3.4 Mobile Bottom Nav — height 64px, `--bg`, top border

5 equal tabs: **Home | Shorts | Create (+) | Explore | Profile**
- Active tab: icon + label, icon in accent gradient
- Create: center, raised 56px gradient circle button overlapping the bar

---

## 4. Component Hierarchy

```
App
├── Header
│   ├── MenuButton
│   ├── Logo
│   ├── SearchBar
│   │   ├── SearchInput
│   │   ├── SearchSubmit
│   │   └── VoiceSearch
│   └── HeaderActions
│       ├── CreateButton
│       ├── IconAction (messages)
│       ├── IconAction (notifications + Badge)
│       └── AvatarMenu (NEW 2026-10-01)
│           ├── IdentityHead
│           ├── NavLink (Your channel / History / Settings)
│           ├── AppearanceSegment (syncs ThemeToggle)
│           ├── SwitchAccountButton
│           └── SignOutButton / SignInButton
├── Sidebar
│   ├── NavItem × N
│   ├── NavSectionLabel
│   └── ChannelListItem × N
├── TrendingPanel (desktop only)
│   ├── TrendingItem × N
│   └── SuggestedFollow × N
├── Routes
│   ├── HomePage
│   │   ├── StoriesRow
│   │   │   └── StoryCircle × N
│   │   ├── FilterChips
│   │   │   └── Chip × N
│   │   └── FeedGrid
│   │       └── PostCard × N  (variant: video | short | photos | text)
│   ├── ShortsPage
│   │   └── ShortPlayer × N (scroll-snap)
│   │       ├── ShortVideo
│   │       ├── ActionRail
│   │       │   └── RailButton × 5 (like, comment, share, save, creator)
│   │       └── CaptionBlock
│   ├── ExplorePage
│   │   ├── TrendingChips
│   │   └── HotFeed (PostCard list, no grid)
│   ├── WatchPage
│   │   ├── VideoPlayer
│   │   ├── VideoInfo (title, channel, actions)
│   │   ├── CommentSection
│   │   │   └── Comment × N
│   │   └── UpNextRail (PostCard, compact variant)
│   ├── ProfilePage
│   │   ├── ProfileHeader
│   │   ├── TabBar (Videos | Shorts | Posts | Tagged)
│   │   └── ProfileGrid
│   │       └── GridTile × N
│   ├── SettingsPage (NEW 2026-10-01)
│   │   ├── AccountCard (avatar, name, handle, email, actions)
│   │   ├── AppearanceCard (Dark/Light seg)
│   │   ├── HistoryCard (list + Clear all)
│   │   ├── PlaybackCard (Autoplay / DataSaver / Personalized switches)
│   │   └── AboutCard
│   └── MobileNav (mobile only)
├── CreateModal (global)
├── NotificationsPanel (global dropdown)
├── MessagesPanel (global dropdown)
└── AccountDialog (NEW 2026-10-01, Sign-in / Switch-account modal)
```

---

## 5. Core Components — Specs

### 5.1 PostCard (the heart of the app)

Four variants share one wrapper: avatar row, content area, action bar.

```
┌─────────────────────────┐
│ ◯ Channel Name · 2h     │   ← MetaRow: 32px avatar, title (title-md),
│                         │     channel + time (meta)
│ ┌─────────────────────┐ │
│ │                     │ │   ← Media (variant-dependent)
│ │       MEDIA         │ │
│ │               (12:04)│ │   ← Duration badge (videos only)
│ └─────────────────────┘ │
│ This is the post title  │
│ ♡ 1.2k  💬 340  ↗  ⌘    │   ← ActionBar
└─────────────────────────┘
```

**Wrapper:** `--surface`, radius-md, padding 12px, hover → `--surface-2`.
**MetaRow:** 32px avatar (radius-full), title max 2 lines (ellipsis), `{channel} · {timeAgo}`.
**ActionBar:** icon buttons 36px, count label (`meta`) beside first three; bookmark right-aligned. Like toggles to `--like` filled heart + count increments (optimistic).

**Variant matrix:**

| Type | Media area | Extra |
|---|---|---|
| `video` | 16:9 thumbnail, radius-md, duration badge bottom-right (`12:04`, black pill) | Hover → preview plays muted |
| `short` | 9:16, max-height 420px, centered, gradient border | Small "Shorts" label top-left |
| `photos` | First photo 4:3; if >1, stacked cards effect + "1/4" counter | Swipe/dots to browse |
| `text` | No media; title = full text, up to 280 chars, `body` at 16px | Subtle `--surface-2` quote-style left border |

### 5.2 FeedGrid
- Desktop: `grid-template-columns: repeat(auto-fill, minmax(340px, 1fr))`, gap 16px
- Tablet: minmax(280px, 1fr)
- Mobile: single column, max-width 480px centered

**Mixing rule:** every 4th slot = 1 `short` card + 1 `text` card (keeps feed varied without clutter).

### 5.3 StoriesRow
- Horizontal scroll, padding 12px 0, gap 12px
- `StoryCircle`: 56px avatar inside 3px accent-gradient ring (radius-full), 10px name label below (`meta`, truncated)
- Seen stories: ring turns `--line`
- Click → full-screen StoryViewer (progress bar top, 5s auto-advance, tap left/right to navigate)

### 5.4 FilterChips
- Sticky under header (desktop), height 48px, horizontal scroll, no wrap
- `Chip`: height 32px, radius-full, `--surface-2` default; **hover = starfield (§7)**; active = lit starfield (nebula + stars + 1px gold hairline, white text) — changed 2026-09-30 from "active = `--text` bg, `--bg` text" so selection speaks the same language as the rest of the UI
- "All" first, then topics

### 5.5 ShortPlayer (ShortsPage)
- Full-height container: `height: calc(100vh - 56px)` (desktop) / `100dvh` (mobile)
- Scroll-snap: one short per viewport, `scroll-snap-type: y mandatory`
- Video: `object-fit: cover`, max-width 420px, centered, radius-md

**ActionRail (right edge, 8px from video):**
Stacked, gap 16px, each `RailButton`: 48px circle `--surface` (60% opacity bg) + label count below.
Order top→bottom: creator avatar (40px, ring) → like → comment → share → save.

**CaptionBlock (bottom-left, over video):**
- Creator handle (`body` / 600) + follow state
- Caption, max 2 lines + "more"
- Sound row: ♪ track name, scrolling marquee style

### 5.6 VideoInfo (WatchPage)
- Title: `hero` 24px/700 (1 line collapsed, "more" expands)
- Row: 40px avatar + channel name + subscriber count ··· Subscribe button (gradient when not subscribed; `--surface-2` when subscribed)
- Action row: Like/Dislike pill (segmented), Share, Save, "…" menu
- Below: description box `--surface`, radius-md, views + date + hashtags, collapsed 2 lines

### 5.7 CommentSection
- Composer: avatar 32px + input `--surface-2` + Post button (accent, disabled until text)
- Comment: 32px avatar, handle + time, text (`body`), actions: like, reply, "…"
- Sort: "Top | Newest" chip toggle

### 5.8 ProfileHeader
- Banner: 100% × 160px, `--nebula` fill + static star dots (same space theme as the Create hover; consumes the token so the fill can never drift from §2)
- Overlapping 80px avatar (3px gradient ring if verified)
- Name (`hero`) + handle + bio (max 160 chars) + link
- Stats row: **1,240 posts · 18.2k followers · 312 following** (`body`/600)
- Buttons: Follow (gradient → Following when on) · Message · "…"

### 5.9 ProfileGrid + TabBar
- TabBar: full-width, 4 tabs, active = `--text` + 3px gradient underline; counts in `meta`
- Videos: 16:9 tiles, duration badge
- Shorts: 9:16 tiles
- Posts: square photos / text cards
- Tagged: same as Posts, dashed ring avatar overlay
- Tile: 3 columns desktop / 2 tablet / 3 mobile (small), gap 4px, hover → scale 1.02 + play icon

### 5.10 Global Overlays

**CreateModal:** centered 480px card, `--surface`, tabs: **Upload | Short | Photo | Text post**. Drag-drop zone first for media types; textarea for text. Privacy chip row (Public / Followers / Only me) bottom.

**NotificationsPanel:** 400px dropdown under bell, `--surface`, radius-md: items = avatar + text ("X liked your post") + time; unread dot accent.

**MessagesPanel:** 360px dropdown: conversation list; opens thread view (header + bubbles + input).

### 5.11 Account Area (added 2026-10-01, per "settings page like other media apps")

**Two account modes.** The app runs either way, and picks automatically:
- **Server accounts** (when served by `server.js`): real sign-in, the account follows the person to any device that can reach the server. Source of truth is `data/db.json`.
- **Local demo accounts** (when served statically, or opened as a file): the original name-only picker, everything in `localStorage`. Same UI, no server.

A fresh visitor on a live server reads as **signed out** — the local demo owner is only used offline, otherwise the menu would offer "Sign out" to someone who never signed in.

**Avatar button** (header right, 32px circle): opens a fixed dropdown menu under the avatar (top 52px, right 12px, z-90, width 300px, `--surface`, `--line` border, starfield hover on rows). Menu contents:
- Identity head: avatar (photo or initial-gradient), name, handle + "NVR Space account"
- Navigation: Your channel → `/profile.html`, History → `/settings.html#history`, Settings → `/settings.html`
- Appearance: segmented label "Appearance: Dark/Light" — clicks the header ThemeToggle internally so the whole app + settings pill stay in sync
- Signed in: Switch account / Sign out
- Signed out (Guest): Sign in (opens dialog)

**Sign-in / Switch-account dialog** (centered, z-121, `--surface`, starfield on rows): lists all demo accounts (photo/initial + name/handle, current marked with check), "Add account" opens the sign-in form. Sign-in form: name input (max 24 chars, auto-focus), live initial-avatar preview + `@handle` derivation (`@` + slugified name), disabled until name entered. No passwords — purely demo; each account keeps its own watch history in `localStorage` under `nvr.account`. Sign-out → Guest account (hidden from list, history still recorded per-device).

**Settings page** (`/settings.html`, new 8th route, full chrome): four cards
- Account: big avatar, name/handle/email, actions (Switch account | Sign out | Sign in when guest)
- Appearance: segmented Dark/Light (click → flips theme + persists; segmented pill is a control so it gets starfield hover, active = `--accent-grad`)
- Watch history (anchor `#history`): list of rows — 160×90 thumbnail, title (2-line clamp), channel + "Watched X ago", remove button (icon, starfield hover); "Clear all" arms on first click ("Click again to confirm", 3s), second click wipes history
- Playback & data: three toggles (Autoplay, Data saver, Personalized) — `.switch` styled pill, checked = `--accent-grad`
- About: version + demo disclaimer

**Watch-history recording:** clicking any video card (`.post-card[data-href="watch.html"]`) or UpNext rail card (`.upnext-card`) stashes the video's title, channel, thumbnail, timestamp to `sessionStorage['nvr.last']`. When the watch page loads (`#watch-title` exists), it consumes the stash (dedupes by title, caps at 50) and appends to the current account's history. Direct watch visits (no stash) fall back to the page's static title + poster.

**Token additions:** `.menu-item`, `.seg-btn` now carry the starfield language (`::before` with `var(--stars)`, nebula hover, same as `.side-item`/`filter_chip`). `.switch` (toggle) uses `--accent-grad` when checked. `.btn-danger` (Clear all) = danger colour on transparent, armed = filled danger.

**Breakpoint note:** the settings mobile rules kick in at ≤700px (QA tiny-target threshold), ensuring seg-btn/btn-danger/menu-item all hit 44px height.

### 5.12 Backend & Real Auth (`server.js`, added 2026-10-02)

Zero-dependency Node server: `node server.js [port]` (default 8149). npm is blocked on this machine, so it uses only Node core — `node:http`, `node:crypto.scryptSync`, `node:fs`. It serves the static site **and** the API from one origin, so there is no CORS setup and no second process.

```
run      node server.js 8149
local    http://localhost:8149
network  http://<LAN-IP>:8149      <- any device on the same WiFi
```

**Storage:** `data/db.json`, written atomically (tmp + rename) so a crash can't truncate it. Expired sessions are swept at boot.

**Endpoints**

| Route | Method | Purpose |
|---|---|---|
| `/api/me` | GET | Current user. **200 `{user:null}` when signed out** — deliberately not 401, so "nobody is logged in" doesn't look like a broken request to devtools/monitoring |
| `/api/register` | POST | `{name, email, password}` → 201 + session cookie |
| `/api/login` | POST | `{email, password}` → 200 + session cookie |
| `/api/logout` | POST | Revokes the session server-side (not just cleared locally) |
| `/api/prefs` | PUT | Syncs the three playback toggles |
| `/api/history` | GET/PUT | Watch history, capped at 200 server-side |
| `/api/account` | DELETE | Deletes the account and kills all its sessions |

**Security properties**
- Passwords: `scrypt` (64-byte key) with a per-user random salt. Never logged, never returned — `/api/register` returns only `id,name,handle,email,prefs,created`.
- Sessions: 32 random bytes in an `HttpOnly; SameSite=Lax; Path=/` cookie, 30-day expiry, **server-side record** so logout actually revokes. A replayed token returns `{user:null}`.
- Login failures are deliberately vague ("Email or password is incorrect") so they never reveal which half was wrong, and are throttled to 8 attempts per 15 min per IP+email.
- **Private files are never served.** `data/db.json` holds password hashes *and* live session tokens — serving it would hand over every account, so `data/`, `node_modules/`, `.git`, `server.js`, dotfiles and `*.db/*.pem/*.key` all return 404. Path traversal outside the root is blocked separately.
- Body reads are capped at 64 KB.

**Cross-device behaviour:** sign in on any device with the same email + password and the same account, watch history and preferences come with it. History writes are debounced (400 ms) and parked in a dirty flag if they happen before the `/api/me` probe answers, then merged by newest-first and flushed — so a video watched during page load isn't lost.

**Deployment readiness (2026-10-02).** `server.js` reads `PORT` from the environment first (hosts inject it; the CLI arg is only the local convenience — without this the process binds the wrong port on Render/Railway/Fly). It exposes `GET /healthz` for host liveness probes, honours `DATA_DIR` so the database can live on a mounted disk, and adds `Secure` to the session cookie when `COOKIE_SECURE=1`. At boot it loudly warns about the three silent deploy killers: no `RESEND_API_KEY` (mail stays in dev mode), no `PUBLIC_ORIGIN` (emailed links point at localhost), no `DATA_DIR` (ephemeral disk wipes accounts every deploy).

The ephemeral-filesystem problem is **not** fixable by changing storage format: a SQLite file inside an ephemeral container dies exactly like a JSON file. Only a persistent volume or an external database survives, so `render.yaml` declares a 1 GB disk and the README says so plainly.

**Verified 2026-10-02:** API 26/26 (validation, duplicate email, wrong password, session replay, persistence across logout/login, private-file blocking ×4, account deletion), auth E2E 13/13 through the real UI incl. a simulated second device seeing the same history, offline demo E2E 20/20, QA 72/72 both themes.

**Not included** (would need a real mail provider / more infra): OAuth social login, rate limiting across multiple server instances, HTTPS (the host provides TLS).

### 5.13 Email verification & password reset (`server.js`, added 2026-10-02)

| Route | Method | Purpose |
|---|---|---|
| `/api/verify?token=` | GET | Confirms the email. Renders its own styled success/failure page so the raw JSON never lands in the user's tab. |
| `/api/resend-verification` | POST | Re-sends the link. **Requires a session** — the server will not mail a stranger. |
| `/api/forgot-password` | POST | Accepts an email, sends a `/reset.html?token=` link. |
| `/api/reset-password` | POST | `{token, password}` — sets the new password. |

**Mailer.** With `RESEND_API_KEY` set, mail goes out through Resend's HTTP API (a plain `fetch`, still zero dependencies). Without it the server runs in **dev mode**: the link is printed to the log *and* returned in the API response, and the UI renders it as a clickable link — so the whole flow is testable with no provider at all. It never claims to have sent something it didn't.

**Tokens** are stored **hashed** (SHA-256), so a leaked `data/db.json` can't be replayed into an account takeover. Single-use (consumed on first attempt, expired or not) and time-limited: 24 h to verify, 1 h to reset. Both tables are swept on boot.

**Anti-enumeration.** `/api/forgot-password` returns the **same 200 + same message** whether or not the address has an account, and only returns a link body in dev mode for a real account. Otherwise the endpoint becomes an account-discovery oracle.

**Ordering bug worth remembering (fixed 2026-10-02):** `/api/reset-password` validates the password **before** consuming the token. `consumeToken` is single-use, so validating afterwards meant a user who typed a 7-character password silently burned their reset link and had to request a new one — a self-inflicted lockout that only showed up under test.

**Resetting a password revokes every existing session** for that account, on the theory that someone who forgot a password may not be the owner.

**Verification is not enforced by default.** Unverified accounts can still sign in and the settings page shows a mint "Verify your email" nag with a Resend button — a mail-provider outage must never be able to lock every user out. Set `REQUIRE_VERIFICATION=1` to make it mandatory.

**UI.** "Forgot your password?" under the sign-in form opens a one-field view; `reset.html` is a standalone page (new password + confirm, inline validation, live mismatch check) that renders its own "Link missing" state when opened without a token.

**Dev-mode links are loopback-only (security fix, 2026-10-02).** Dev mode returns the whole mail — including a **live password-reset link** — in the API response, so the flow works with no mail provider. Exposed to the internet that is account takeover by POST: `/api/forgot-password` with a victim's address hands back a working reset link. It is now gated on the request being genuinely local, and the socket check alone was **not** sufficient: a `cloudflared` tunnel runs on this machine, so tunneled traffic also arrives from `127.0.0.1` and sailed straight past it — the first fix was still leaking, proved by registering an account over the tunnel and reading the link back. The gate therefore also rejects any request carrying proxy headers (`CF-Connecting-IP`, `X-Forwarded-For`, `X-Real-IP`, `Forwarded`, `X-Forwarded-Host`, `CF-Ray`), which a tunnel always stamps. Verified by calling the same endpoint twice with the same address: loopback got the link, the public tunnel did not. `DEV_MAIL_LINKS=1/0` overrides, and the server warns at boot if `1` is forced on.

**Verified 2026-10-02:** verify/reset suite 24/24 (link format, single-use replay, unverified sign-in, no-enumeration, short-password rejection without burning the token, session revocation, new password accepted + old rejected, garbage token rejected), core API 26/26, auth E2E 13/13, offline demo 20/20, QA 72/72 (9 pages × 4 widths × 2 themes — the sweep caught a 17px-tall link on `reset.html`, since padded to 44px).

---

## 6. Page Inventory & Routes

| Route | Page | Notes |
|---|---|---|
| `/index.html` | Home | Stories + filter chips + mixed FeedGrid + trending panel |
| `/shorts.html` | Shorts | Full-screen ShortPlayer stack |
| `/explore.html` | Explore | Trending chips + HotFeed (list layout) |
| `/watch.html` | Watch | Player + comments + UpNext rail |
| `/profile.html` | Profile | Header + tabbed grid |
| `/subscriptions.html` | Subscriptions | FeedGrid filtered to subscribed channels only |
| `/settings.html` | Settings | Account, Appearance, Watch history, Playback & data, About (added 2026-10-01) |
| `/reset.html` | Reset password | Standalone, reached only from the emailed link. Two fields + confirm; no app chrome (added 2026-10-02) |

Header, sidebar, trending panel, mobile nav, Create/Notifications/Messages overlays are **global** — identical on every page.

---

## 7. Interaction & States

| Element | Hover | Active/Selected | Loading |
|---|---|---|---|
| PostCard | bg `--surface-2`, video preview autoplays muted | — | skeleton shimmer card |
| Like | heart fills `--like`, +1 pop animation | toggles off on re-click | — |
| Save | bookmark fills `--text` | — | — |
| Follow | gradient → lit starfield "Following" | hover "Following" shows "Unfollow" (danger) | — |
| Chips | starfield fill (§7) | lit starfield + gold hairline | — |
| Buttons | brighten 8% (dark-surface buttons also step `--surface-2` → `--line`, since 8% is invisible on #212121) **plus the starfield fill** (gradient CTAs keep their gradient and gain the stars) | press scale 0.97 | spinner in button |
| Short swipe | — | snap to next; preload ±2 videos | spinner center |

**Starfield language** (user request, 2026-09-30): every *control* lights up with the Create button's fill — `--nebula` radial gradient under the label, tiled white/gold/blue stars fading in over .25s. Covers the logo, sidebar (expanded + collapsed rail), mobile nav, header icon buttons, chips/tabs and all buttons; the current nav item / selected chip / Followed / Subscribed state **stays lit** with a 1px gold hairline where there is no other active marker.
Deliberately **not** starfielded (user, 2026-09-30): the search bar (button + input), the like/save/comment row, and content surfaces — feed cards, up-next, notification/message/trend/follow rows, story avatars — where glitter fought the media. Those keep their original hovers.
**The blue (user, 2026-10-01):** what the user asked to remove was the *logo wordmark's* colour — `.logo` had no author `color` rule, so the browser's default link colour (`LinkText`, `rgb(158,158,255)` with `color-scheme: dark`) showed through on every page; that was the blue in their screenshot. Fixed with an explicit `color: var(--text)` on `.logo` (plus `var(--text)` on `.trend-item`, the other unstyled anchor — its visible text sits in coloured spans, but the base is now pinned too). When the first pass over-applied "remove the blue" to the whole palette, the user clarified *"don't remove the blue"* — so the deep-space palette was restored the same day: `--nebula` is again the original blue `#26265a → #13132c → #0a0a18`, stars are white/gold/blue (`#a8c6ff`), and links keep their original blues behind `--link` (`#a8c6ff` dark / `#0b57d0` light). The brief accent-toned magenta detour (same morning) was reverted. `.create-btn` and `.profile-banner` both consume `var(--nebula)`, so the fill can't drift from the token again.
**Light theme (2026-10-01):** the starfield deliberately keeps its dark fill in light mode too — a lit control reads as a little patch of space on the light UI, and that keeps the white labels/stars legible with zero per-theme star overrides (§2.1).

**Empty states:** centered icon (96px, `--line`) + message (`section-h`) + action button.

**Error toast:** bottom-center pill, `--danger` border, auto-dismiss 4s.

---

## 8. Accessibility & Polish

- All icon buttons: `aria-label` (e.g., "Like", "Share", "Notifications").
- Focus ring: 2px `--accent-grad` offset 2px, visible on keyboard nav (drawn as layered `box-shadow`, since `outline` can't take a gradient; forced-colors mode falls back to a real outline). One rule only — no duplicate `:focus-visible` declarations.
- `[hidden]` always wins (`display: none !important`): overlays that set `display: flex` must never stay laid out while invisible.
- Text posts: `article` landmark; videos: native controls on focus.
- Min tap target: 44×44px on mobile.
- Respects `prefers-reduced-motion`: disable snap-scroll autoplay transitions.
- Images: descriptive `alt`; avatars: `alt="{name} avatar"`.

---

## 9. Build Order (recommended)

1. Tokens + App Shell (header, sidebar, mobile nav) — shared by all pages
2. PostCard component + FeedGrid (home page works end-to-end)
3. StoriesRow + FilterChips
4. ShortsPage
5. ExplorePage
6. ProfilePage
7. WatchPage + comments
8. Global overlays (Create, Notifications, Messages)
9. Polish pass: hover states, skeletons, empty states, mobile QA

---

*This document is the single source of truth for the redesign. Any change to layout, tokens, or components should be updated here first.*
