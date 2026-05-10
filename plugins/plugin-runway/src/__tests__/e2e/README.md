# E2E tests (`plugin-runway`)

This directory contains the **RunwayPluginTestSuite** exported from `plugin-starter.e2e.ts` for the ElizaOS e2e runner (`elizaos test --type e2e` when wired in your project).

## Suite contents

- `runway_services_registered` — `runway` + `runway-media` services exist on the runtime
- `runway_actions_registered` — core Runway actions are registered
- `runway_status_provider` — `RUNWAY_STATUS` provider returns text
- `runway_generate_video_action_smoke` — stubs Runway services and runs `RUNWAY_GENERATE_VIDEO` handler

## Wiring in a plugin package

```typescript
import RunwayPluginTestSuite from './__tests__/e2e/plugin-starter.e2e';

export const myPlugin: Plugin = {
  name: 'my-plugin',
  tests: [RunwayPluginTestSuite],
};
```

Component/unit tests live under `src/__tests__/*.test.ts` and run with `bun test` (may require monorepo/workspace so `@elizaos/core` resolves).
