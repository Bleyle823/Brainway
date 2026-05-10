# Brainway repository

Monorepo layout:

| Path | Description |
|------|-------------|
| [`Brainway/`](Brainway/README.md) | Web application — TanStack Start, Vite, Cloudflare Worker |
| [`docs/`](docs/README.md) | Documentation index |
| [`plugins/runway/`](plugins/runway/README.md) | Hermes (Python) Runway plugin |
| [`plugins/plugin-runway/`](plugins/plugin-runway/README.md) | ElizaOS Runway plugin |

**Run the app:** see [`Brainway/README.md`](Brainway/README.md) (`cd Brainway && npm install && npm run dev`). **Vercel:** set the project **Root Directory** to **`Brainway`** (see `Brainway/vercel.json` and the Deployment section there). The learner-facing live meeting entry point in the app is **`/meet`** (paste a conference URL and send a Character via Recall when `recall-bridge` + `RECALL_BRIDGE_URL` are configured); **`/live`** is the full in-browser realtime control surface.

Optional **`recall-bridge/`** ([README](recall-bridge/README.md)): Node server adapted from [Runway Characters Meet](https://github.com/runwayml/runway-characters-meet) — deploy separately with `RECALL_API_KEY` and `PUBLIC_URL`.
