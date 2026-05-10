# ElizaOS plugin: Runway (`plugin-runway`)

ElizaOS plugin integrating the [Runway Developer API](https://docs.dev.runwayml.com/): **Gen-4.5** video, **gen4_image**, **Characters** (`gwm1_avatars` realtime sessions), **Eleven**-family audio tasks, **gen4_aleph** video-to-video, and **act_two** character performance.

## Requirements

- **Bun** (ElizaOS plugin workflow)
- `RUNWAYML_API_SECRET` — org API key from [dev.runwayml.com](https://dev.runwayml.com/)

## Install

From this package directory:

```bash
bun install
```

Peer/runtime: `@elizaos/core` (this repo uses `workspace:*` in the monoretail layout).

## Build

```bash
bun run build
```

`@runwayml/sdk` is marked **external** in the bundle; ensure it is installed wherever the plugin runs.

## Agent configuration

Set secrets via environment or plugin `init` config:

| Variable | Required | Description |
|----------|----------|-------------|
| `RUNWAYML_API_SECRET` | Yes (for API calls) | Org API secret |
| `RUNWAYML_API_BASE_URL` | No | Base URL including `/v1` |
| `RUNWAYML_BASE_URL` | No | Alias; origin-only gets `/v1` appended |
| `RUNWAY_CHARACTER_AVATAR_ID` | No | Preset id or custom avatar id |
| `RUNWAY_CHARACTER_AVATAR_TYPE` | No | `runway-preset` (default) or `custom` |

See [`.env.example`](.env.example).

## Usage in an Eliza character

```ts
import runwayPlugin from '@elizaos/plugin-starter';

export const character = {
  // ...
  plugins: [runwayPlugin],
};
```

Register **services** in load order: `runway` → `runway-media` → `runway-characters` (the plugin array order defines this when using the default `Plugin.services` list).

## Actions (natural language)

| Action | Trigger examples |
|--------|------------------|
| `RUNWAY_GENERATE_VIDEO` | “generate video …”, “create video …”, “text to video …” |
| `RUNWAY_GENERATE_IMAGE` | “generate image …”, “create image …”, “runway image …” |
| `RUNWAY_START_CHARACTER_SESSION` | “start character session …”, “runway character …” |
| `RUNWAY_GENERATE_AUDIO` | “sound effect …”, “text to speech …”, “voice dub …”, “speech to speech …” |
| `RUNWAY_TRANSFORM_MEDIA` | “video to video …”, “act two …”, “transform video …” |

Best-effort `key:value` pairs in the message (e.g. `promptVideo:https://...`, `ratio:1280:720`, `targetLang:es`) are parsed in actions.

## Providers

- `RUNWAY_STATUS` — API base URLs and whether a secret is configured (never prints the secret).
- `RUNWAY_ACTIVE_SESSIONS` — guidance on Characters session lifetime.
- `RUNWAY_MEDIA_CAPABILITIES` — model summary for the LLM.

## HTTP route

- `GET /runway/health` — `{ plugin, ok, hasSecret }`.

## Characters / WebRTC

`RUNWAY_START_CHARACTER_SESSION` returns `serverUrl`, `token`, `roomName`, and `sessionId` for use with **`@runwayml/avatars-react`** in a browser client. The Eliza agent does not embed WebRTC; surface credentials to your UI.

## Development

```bash
bun run dev      # elizaos dev (when wired in a project)
bun test         # unit + integration (mocks Runway; no real API calls)
```

## E2E suite export

The ElizaOS e2e runner can import:

```ts
import RunwayPluginTestSuite from './src/__tests__/e2e/plugin-starter.e2e';
```

(`RunwayPluginTestSuite` in `src/__tests__/e2e/plugin-starter.e2e.ts`.)

## License

See package `license` field.
