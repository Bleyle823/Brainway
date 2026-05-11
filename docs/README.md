# Documentation

Project documentation for contributors and operators. **Mintlify** serves MDX from this folder using [`docs.json`](../docs.json) at the **repository root**.

## Mintlify setup

- In the Mintlify dashboard, point the project at the repo root that contains **`docs.json`**.
- MDX pages: **`docs/*.mdx`** (see navigation in `docs.json`).
- Assistant-only hints: [`.mintlify/Assistant.md`](../.mintlify/Assistant.md) (not published on the docs site).

## Page index

| Page | Description |
|------|-------------|
| [Introduction](introduction.mdx) | Product overview, mental model, audience map |
| [Repository layout](repository-layout.mdx) | Monorepo map and “where logic lives” |
| [Development workflow](development-workflow.mdx) | Local dev, scripts, prerequisites |
| [Brainway app (hub)](brainway-app.mdx) | Links into all app-focused guides |
| [Architecture](brainway-architecture.mdx) | TanStack Start, server fns, Workers |
| [Routes & features](brainway-routes.mdx) | `/create`, `/transform`, `/live`, `/meet`, … |
| [Neurodiversity profiles](neurodiversity-profiles.mdx) | Presets, prompts, Characters |
| [Runway integration](runway-integration.mdx) | API host, SDK vs fetch, models |
| [Environment variables](environment-variables.mdx) | Brainway + recall-bridge |
| [Recall bridge](recall-bridge.mdx) | Recall.ai, HTTP + WebSocket API |
| [Deployment](deployment.mdx) | Cloudflare Workers, Vercel, bridge |
| [Troubleshooting](troubleshooting.mdx) | Common errors |
| [Security & privacy](security-privacy.mdx) | Secrets, data flows, minors |
| [Research, claims, and limitations](research-limitations.mdx) | Honest scope |
| [Contributing](contributing.mdx) | Branches and conventions |
| [Plugins overview](plugins-overview.mdx) | Hermes + ElizaOS |

## In-repo READMEs

| Path | Role |
|------|------|
| [Root README](../README.md) | Product narrative, roadmap, high-level architecture |
| [Brainway/README.md](../Brainway/README.md) | App file layout, env, scripts, deploy nuance |
| [recall-bridge/README.md](../recall-bridge/README.md) | Tunnel + Recall quickstart |
