# Recall bridge (Zoom / Meet / Teams bot)

Node server that joins meetings via [Recall.ai](https://www.recall.ai/) and loads [`public/bot.html`](public/bot.html) as the bot’s camera page. It orchestrates Runway realtime Characters + LiveKit the same way as [Runway Characters Meet](https://github.com/runwayml/runway-characters-meet).

Brainway’s `/meet` page talks to this app using **`RECALL_BRIDGE_URL`** (HTTPS origin, no trailing slash).

---

## 1. Install

From the monorepo root:

```bash
cd recall-bridge
npm install
```

Copy the env template and edit `.env`:

```bash
cp .env.example .env   # Windows: copy .env.example .env
```

Required in `.env`:

| Variable | Description |
|----------|-------------|
| `RECALL_API_KEY` | Recall.ai API token (dashboard → API keys) |
| `RECALL_REGION` | Your Recall region, often `us-west-2` |
| `PUBLIC_URL` | **Public HTTPS base URL** of this service (Recall loads `{PUBLIC_URL}/bot.html` and connects WebSockets here). No trailing slash. |

Optional:

| Variable | Default | Description |
|----------|---------|-------------|
| `PORT` | `3000` | Local HTTP listen port (use **3099** if `3000` is taken — matches `npm run tunnel` below). |

### Already configured / running

- **`npm run dev`** — watches `server.js` (loads `.env` via dotenv).
- **`npm run tunnel`** — Runs Cloudflare Quick Tunnel to **`http://127.0.0.1:`** + **`PORT`** from `.env` (fallback **3099** if unset). Uses **`recall-bridge/.tools/cloudflared.exe`** when present (download from [cloudflared releases](https://github.com/cloudflare/cloudflared/releases) if needed), otherwise **`cloudflared`** on your PATH. When the tunnel URL appears, the script **writes `PUBLIC_URL`** in `.env` automatically — **restart** **`npm run dev`** so the bridge reloads it.

---

## 2. Local development (tunnel required)

Recall’s bots reach your machine over the internet. **`PUBLIC_URL` must be `https://` with a public hostname** — Recall returns **`403 request_blocked`** if you send `localhost`, `127.0.0.1`, or plain `http://`.

**Quick tunnel** (bundled binary under **`.tools/`** on Windows after you drop `cloudflared.exe` there, or install [`cloudflared`](https://developers.cloudflare.com/cloudflare-one/connections/connect-apps/install-and-setup/installation/) globally):

```bash
cd recall-bridge
npm run tunnel
```

Leave this process running. The first `https://….trycloudflare.com` line updates **`PUBLIC_URL`** in `.env`; restart **`npm run dev`** in another terminal so the bridge picks it up.

```bash
# Terminal B — recall-bridge (PORT defaults from .env; use 3099 if 3000 is busy)
npm run dev
```

Then point Brainway at the bridge:

```bash
# Brainway/.env or .env.local — while developing on one PC you may use:
RECALL_BRIDGE_URL=http://127.0.0.1:3099

# When Recall must reach the bot page from the internet, use the same https tunnel URL:
# RECALL_BRIDGE_URL=https://….trycloudflare.com
```

Restart Brainway (`npm run dev`). Use `/meet` → **Send Character to Meeting**.

---

## 3. Production deploy

Deploy this folder as a **single Node HTTP service** (Railway, Render, Fly.io, etc.):

1. Set **`RECALL_API_KEY`**, **`RECALL_REGION`**, **`PUBLIC_URL`** (your service’s public `https://` URL).
2. Do **not** set `PORT` unless your host requires it; many platforms inject `PORT` automatically.
3. Start command: `npm start`
4. Set **`RECALL_BRIDGE_URL`** on Brainway to that same public origin.

---

## 4. Verify it’s running

With the server up:

- Open `{PUBLIC_URL}/bot.html` in a browser — you should see a loading shell (missing `?session=` is expected).
- Logs should show: `Brainway Recall bridge listening on http://127.0.0.1:${PORT}` and the Recall `PUBLIC_URL` lines.

If Recall webhook/video relay fails, double-check **`PUBLIC_URL` matches the tunnel or prod URL exactly** (scheme `https`, no trailing slash). If you see **`request_blocked`**, you likely left **`PUBLIC_URL` as localhost** — fix with **`npm run tunnel`** as above.
