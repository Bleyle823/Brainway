# Documentation

This folder holds project documentation that is separate from the in-repo plugin READMEs.

**Mintlify:** Site config is [`docs.json`](../docs.json) at the **repository root** (next to this folder). MDX pages live here (`docs/*.mdx`). In the Mintlify dashboard, set the path to the directory containing `docs.json` to **`.`** (repo root) or leave the default root. Assistant instructions: [`.mintlify/Assistant.md`](../.mintlify/Assistant.md). **Cursor MCP:** [`.cursor/mcp.json`](../.cursor/mcp.json).

## Layout

| Path | Description |
|------|-------------|
| [Brainway app](../Brainway/README.md) | TanStack Start web app under `Brainway/`: `src/`, `public/`, Vite, Cloudflare Worker |
| [`plugins/runway/`](../plugins/runway/README.md) | **Hermes** — Python Runway plugin |
| [`plugins/plugin-runway/`](../plugins/plugin-runway/README.md) | **ElizaOS** — TypeScript Runway plugin |

## Main guide

- **[Repository overview](../README.md)** — Top-level layout and links.
- **[Brainway app README](../Brainway/README.md)** — Architecture, env vars, scripts, deployment, troubleshooting.

Add deeper guides here (e.g. `architecture.md`, `contributing.md`) as the project grows.
