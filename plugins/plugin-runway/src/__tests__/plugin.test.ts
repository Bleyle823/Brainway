import { describe, expect, it, beforeEach } from 'bun:test';
import {
  runwayPlugin,
  RunwayService,
  CharacterService,
  MediaProcessingService,
  generateVideoAction,
  generateImageAction,
  startCharacterAction,
} from '../index';
import type { IAgentRuntime, Memory, State, HandlerCallback } from '@elizaos/core';
import { logger } from '@elizaos/core';
import { createMockRuntime, createTestMemory, createTestState } from './test-utils';

describe('Runway plugin metadata', () => {
  it('should expose plugin-runway', () => {
    expect(runwayPlugin.name).toBe('plugin-runway');
    expect(runwayPlugin.description?.length).toBeGreaterThan(0);
    expect(runwayPlugin.actions?.length).toBe(5);
    expect(runwayPlugin.providers?.length).toBe(3);
    expect(runwayPlugin.services?.length).toBe(3);
    expect(runwayPlugin.routes?.length).toBeGreaterThan(0);
  });

  it('should merge config on init', async () => {
    const runtime = createMockRuntime();
    const prev = process.env.RUNWAYML_API_SECRET;
    process.env.RUNWAYML_API_SECRET = 'test-secret-key';
    if (runwayPlugin.init) {
      await runwayPlugin.init({ RUNWAYML_API_SECRET: 'from-init' }, runtime);
    }
    expect(process.env.RUNWAYML_API_SECRET).toBe('from-init');
    process.env.RUNWAYML_API_SECRET = prev;
  });
});

describe('Action validation', () => {
  let runtime: IAgentRuntime;

  beforeEach(() => {
    runtime = createMockRuntime();
  });

  it('RUNWAY_GENERATE_VIDEO validates on keywords', async () => {
    const ok = await generateVideoAction.validate?.(
      runtime,
      createTestMemory({ content: { text: 'generate video: sunset over water' } }),
      createTestState(),
    );
    expect(ok).toBe(true);
    const bad = await generateVideoAction.validate?.(
      runtime,
      createTestMemory({ content: { text: 'hello only' } }),
      createTestState(),
    );
    expect(bad).toBe(false);
  });

  it('RUNWAY_GENERATE_IMAGE validates on keywords', async () => {
    const ok = await generateImageAction.validate?.(
      runtime,
      createTestMemory({ content: { text: 'create image: a red balloon' } }),
      createTestState(),
    );
    expect(ok).toBe(true);
  });

  it('RUNWAY_START_CHARACTER_SESSION validates on keywords', async () => {
    const ok = await startCharacterAction.validate?.(
      runtime,
      createTestMemory({ content: { text: 'start character session' } }),
      createTestState(),
    );
    expect(ok).toBe(true);
  });
});

describe('RUNWAY_GENERATE_VIDEO handler (mocked services)', () => {
  let runtime: IAgentRuntime;

  beforeEach(() => {
    const runwayMock = {
      getApiSecret: () => 'key_test',
      startGen45Video: async () => ({ id: 'task_1' }),
    };
    const mediaMock = {
      waitForTask: async () => ({
        status: 'SUCCEEDED' as const,
        output: ['https://cdn.example.com/out.mp4'],
        id: 'task_1',
      }),
    };
    runtime = createMockRuntime({
      getService: ((type: string) => {
        if (type === RunwayService.serviceType) return runwayMock;
        if (type === MediaProcessingService.serviceType) return mediaMock;
        return null;
      }) as IAgentRuntime['getService'],
    });
  });

  it('returns video URL on success', async () => {
    const message = createTestMemory({
      content: { text: 'generate video: calm forest stream', source: 'test' },
    });
    const result = await generateVideoAction.handler!(
      runtime,
      message,
      undefined as State | undefined,
      undefined,
      undefined as HandlerCallback | undefined,
    );
    expect(result.success).toBe(true);
    expect((result as { data?: { videoUrl?: string } }).data?.videoUrl).toContain('https://');
  });
});

describe('Health route', () => {
  it('returns JSON', async () => {
    const route = runwayPlugin.routes?.find((r) => r.name === 'runway-plugin-health');
    expect(route).toBeDefined();
    const res: { json: (x: unknown) => void; body?: unknown } = {
      json(data: unknown) {
        this.body = data;
      },
    };
    await route!.handler!({}, res as never, createMockRuntime());
    expect((res as { body: { plugin?: string } }).body?.plugin).toBe('plugin-runway');
  });
});

describe('RunwayService', () => {
  it('start/stop lifecycle', async () => {
    const runtime = createMockRuntime({
      getSetting: () => 'test-runway-secret',
    });
    const svc = await RunwayService.start(runtime);
    expect(svc).toBeInstanceOf(RunwayService);
    expect(RunwayService.serviceType).toBe('runway');

    const withSvc = createMockRuntime({
      getSetting: () => 'test-runway-secret',
      getService: ((t: string) => (t === 'runway' ? svc : null)) as IAgentRuntime['getService'],
    });
    await RunwayService.stop(withSvc);
  });
});

describe('CharacterService', () => {
  it('start/stop lifecycle', async () => {
    const runway = await RunwayService.start(
      createMockRuntime({ getSetting: () => 'test-runway-secret' }),
    );
    const runtime = createMockRuntime({
      getSetting: () => 'test-runway-secret',
      getService: ((t: string) => (t === 'runway' ? runway : null)) as IAgentRuntime['getService'],
    });
    const svc = await CharacterService.start(runtime);
    expect(svc).toBeInstanceOf(CharacterService);
    await CharacterService.stop(runtime);
  });
});

describe('MediaProcessingService', () => {
  it('requires RunwayService registered', async () => {
    const runtime = createMockRuntime({ getService: () => null });
    const media = await MediaProcessingService.start(runtime);
    await expect(
      media.waitForTask('any', { timeoutMs: 100, pollIntervalMs: 10 }),
    ).rejects.toThrow(/RunwayService/);
  });
});
