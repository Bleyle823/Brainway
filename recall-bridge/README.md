# Recall bridge (Zoom / Meet / Teams bot)

Node server that joins video meetings via [Recall.ai](https://www.recall.ai/) and renders [`public/bot.html`](public/bot.html) as the bot camera feed. Runway realtime Characters + LiveKit run here; Brainwave’s `/meet` page calls this service through `RECALL_BRIDGE_URL`.

## Setup

```bash
cd recall-bridge
npm install
cp .env.example .env
# Add RECALL_API_KEY and set PUBLIC_URL to this server’s public HTTPS origin
```

For local development, tunnel this port and set `PUBLIC_URL` to the tunnel URL (see upstream [runway-characters-meet](https://github.com/runwayml/runway-characters-meet) README).

## Environment

| Variable | Description |
|----------|-------------|
| `RECALL_API_KEY` | Recall.ai API token |
| `RECALL_REGION` | e.g. `us-west-2` |
| `PORT` | Listen port (default `3000`) |
| `PUBLIC_URL` | HTTPS origin where this app is reachable (Recall opens `PUBLIC_URL/bot.html`) |

Brainwave (`Brainway/` app) needs `RECALL_BRIDGE_URL` pointing to this same origin (no trailing slash).
