# NVR Space — deploy notes

## What this is

A static-looking video app with a real backend. One Node process serves the
whole site **and** the API, so there is no build step, no bundler and no npm
install — `server.js` uses only Node's standard library.

```
node server.js          # http://localhost:8149
```

## Run it locally

```bash
node server.js                 # http://localhost:8149
node server.js 9000            # custom port
DATA_DIR=./mydata node server.js   # accounts elsewhere
```

Any device on the same WiFi can reach it at the LAN address the server prints
on startup.

## Deploy

**Render (easiest — `render.yaml` is included)**

1. Push the folder to GitHub.
2. Render → *New* → *Blueprint* → pick the repo. It reads `render.yaml`.
3. Fill in the two secret values it marks `sync: false`:
   - `PUBLIC_ORIGIN` — your real URL, e.g. `https://nvr-space.onrender.com`
     (without this, password-reset links point at localhost and are useless)
   - `RESEND_API_KEY` — from [resend.com](https://resend.com) (without it,
     verification/reset links are printed to the log and returned by the API —
     "dev mode")
4. Deploy.

**Railway / Fly.io / Heroku** — all inject `PORT`, which `server.js` already
reads. Use `node server.js` as the start command and set the same env vars.

## Environment variables

| Variable | Required? | What it does |
|---|---|---|
| `PORT` | auto | Injected by the host. Don't set it. |
| `PUBLIC_ORIGIN` | **in production** | Base URL used in verification/reset emails. |
| `RESEND_API_KEY` | for real email | Sends mail via Resend. Absent = dev mode (loopback only). |
| `MAIL_FROM` | no | Sender, e.g. `NVR Space <no-reply@you.com>`. |
| `DEV_MAIL_LINKS` | no | `1` returns dev mail to anyone (unsafe publicly), `0` never. Unset = loopback only. |
| `COOKIE_SECURE` | `1` in production | Adds `Secure` to the session cookie (HTTPS only). |
| `REQUIRE_VERIFICATION` | `0` / `1` | `1` blocks sign-in until the email is confirmed. |
| `DATA_DIR` | recommended in production | Where `db.json` lives. Point at a mounted disk. |
| `HOST` | no | Defaults to `0.0.0.0` so hosts *and* the LAN can reach it. |

## Public URL without a hosting account (temporary)

`cloudflared` gives a real public HTTPS URL with no signup:

```bash
cloudflared tunnel --url http://localhost:8149 --no-autoupdate
```

It prints a `https://<random>.trycloudflare.com` address. **This is for demos and
sharing with someone right now, not for production:**

- the URL **changes every time you restart it**
- it only works while your machine is awake and the process is running
- there's no uptime guarantee and no custom domain

To keep the emailed links pointing at the tunnel, start the server with the
same URL:

```bash
PUBLIC_ORIGIN=https://<random>.trycloudflare.com node server.js
```

## Dev mode is deliberately loopback-only

Without `RESEND_API_KEY` the server prints the mail to its log **and returns it
in the API response**, so verification and password-reset can be exercised with
no mail provider at all.

That response contains a **working password-reset link**, so handing it to
anyone else is a full account takeover: a stranger could POST their victim's
email to `/api/forgot-password` and read the reset link straight out of the
response.

So the body is only returned when the request is genuinely local:

- the socket address must be loopback, **and**
- the request must carry no proxy headers

The second condition matters more than it looks. A tunnel (`cloudflared`,
`ngrok`, any LAN proxy) runs *on this machine*, so its forwarded traffic also
arrives from `127.0.0.1` and passes a naive socket check. Cloudflare stamps
`CF-Connecting-IP` on everything it forwards, which is what gives it away.

Override with `DEV_MAIL_LINKS=1` / `=0` — and note that `=1` on a public server
re-opens the hole, which is why the server warns about it at boot.

**The right fix for a real deployment is `RESEND_API_KEY`.** Dev mode exists so
you can build and test without an account; it is not a substitute for mail.

## The one thing that will bite you

**On most free tiers the container's disk is wiped on every redeploy.** The
database is a JSON file, so every account and every session disappears on each
deploy unless you mount a persistent disk and point `DATA_DIR` at it.

`render.yaml` already declares a 1 GB disk at `/var/data` — leave it attached.
The server prints a warning at boot if `DATA_DIR` is unset.

Changing the storage *format* would not fix this: a SQLite file inside an
ephemeral container dies exactly the same way. Only a persistent volume or an
external database survives.

## Email

Without `RESEND_API_KEY` the server runs in **dev mode**: the verification /
reset link is printed to the log *and* returned in the API response, and the UI
shows it as a clickable link. The whole flow is therefore testable offline.

## Security notes

- Passwords: `scrypt`, per-user salt, never returned by the API.
- One-time tokens (verify/reset) are stored **hashed**, single-use, expiring.
- `POST /api/forgot-password` always answers identically whether or not the
  address exists, so it can't be used to discover accounts.
- Resetting a password revokes every existing session for that account.
- `data/db.json`, `server.js`, dotfiles and key files are never served over HTTP.
- Login throttling: 8 failures per 15 minutes per IP + email.
- Still missing for a public launch: HTTPS (use the host's TLS), a real
  database, rate limiting shared across instances, and Google/GitHub OAuth.

## Tests

The suite lives in the temp folder, not in the repo:

- `api-test.mjs` — register/login/logout, validation, session replay, file exposure
- `api-verify-reset.mjs` — email verification + password reset
- `e2e-auth.mjs` — the real UI, including a second device seeing the same history
- `e2e-account.mjs` — offline demo mode (no server)
- `qa-eval.mjs` + `qa-run.js` — 9 pages × 4 widths × 2 themes