import { describe, expect, it, beforeEach } from 'bun:test';
import {
  runwayPlugin,
  RunwayService,
  RunwayManagementService,
  CharacterService,
  MediaProcessingService,
  generateVideoAction,
  generateImageAction,
  startCharacterAction,
  getOrganizationAction,
  getCreditUsageAction,
  listWorkflowsAction,
  getWorkflowAction,
  runWorkflowAction,
  listAvatarsManagementAction,
  listDocumentsAction,
  listVoicesAction,
  getAvatarManagementAction,
} from '../index';
import type { IAgentRuntime, Memory, State, HandlerCallback } from '@elizaos/core';
import { logger } from '@elizaos/core';
import { createMockRuntime, createTestMemory, createTestState } from './test-utils';

describe('Runway plugin metadata', () => {
  it('should expose plugin-runway', () => {
    expect(runwayPlugin.name).toBe('plugin-runway');
    expect(runwayPlugin.description?.length).toBeGreaterThan(0);
    expect(runwayPlugin.actions?.length).toBe(23);
    expect(runwayPlugin.providers?.length).toBe(3);
    expect(runwayPlugin.services?.length).toBe(4);
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

  it('RUNWAY_START_CHARACTER_SESSION validates on runway character shortcut (singular)', async () => {
    const ok = await startCharacterAction.validate?.(
      runtime,
      createTestMemory({ content: { text: 'Start my runway character session credentials' } }),
      createTestState(),
    );
    expect(ok).toBe(true);
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

  it('RUNWAY_GET_ORGANIZATION validates on keywords', async () => {
    const ok = await getOrganizationAction.validate?.(
      runtime,
      createTestMemory({ content: { text: 'runway organization info' } }),
      createTestState(),
    );
    expect(ok).toBe(true);
  });

  it('RUNWAY_GET_ORGANIZATION validates on natural phrasing with Runway in message', async () => {
    const ok = await getOrganizationAction.validate?.(
      runtime,
      createTestMemory({ content: { text: "What's my Runway credit balance?" } }),
      createTestState(),
    );
    expect(ok).toBe(true);
  });

  it('RUNWAY_GET_ORGANIZATION does not validate for generic billing without Runway context', async () => {
    const bad = await getOrganizationAction.validate?.(
      runtime,
      createTestMemory({ content: { text: "What's my credit balance?" } }),
      createTestState({ text: 'Unrelated chat.' }),
    );
    expect(bad).toBe(false);
  });

  it('RUNWAY_GET_CREDIT_USAGE validates on natural phrasing with Runway in message', async () => {
    const ok = await getCreditUsageAction.validate?.(
      runtime,
      createTestMemory({ content: { text: 'Show my Runway usage history for this month' } }),
      createTestState(),
    );
    expect(ok).toBe(true);
  });

  it('RUNWAY_GET_CREDIT_USAGE validates when state mentions Runway but message is short', async () => {
    const ok = await getCreditUsageAction.validate?.(
      runtime,
      createTestMemory({ content: { text: 'Can I see my usage report?' } }),
      createTestState({ text: 'We are using the Runway developer API.' }),
    );
    expect(ok).toBe(true);
  });

  it('RUNWAY_LIST_AVATARS validates on natural phrasing with Runway in message', async () => {
    const ok = await listAvatarsManagementAction.validate?.(
      runtime,
      createTestMemory({ content: { text: 'Fetch my Runway avatars please' } }),
      createTestState(),
    );
    expect(ok).toBe(true);
  });

  it('RUNWAY_LIST_AVATARS validates when state mentions Runway but message is short', async () => {
    const ok = await listAvatarsManagementAction.validate?.(
      runtime,
      createTestMemory({ content: { text: 'What avatars do I have?' } }),
      createTestState({ text: 'Runway Characters API setup.' }),
    );
    expect(ok).toBe(true);
  });

  it('RUNWAY_LIST_AVATARS does not validate without Runway context', async () => {
    const bad = await listAvatarsManagementAction.validate?.(
      runtime,
      createTestMemory({ content: { text: 'What avatars do I have?' } }),
      createTestState({ text: 'Video game character roster.' }),
    );
    expect(bad).toBe(false);
  });

  it('RUNWAY_LIST_DOCUMENTS validates on natural phrasing with Runway in message', async () => {
    const ok = await listDocumentsAction.validate?.(
      runtime,
      createTestMemory({ content: { text: 'List my Runway knowledge documents' } }),
      createTestState(),
    );
    expect(ok).toBe(true);
  });

  it('RUNWAY_LIST_VOICES validates on natural phrasing with Runway in message', async () => {
    const ok = await listVoicesAction.validate?.(
      runtime,
      createTestMemory({ content: { text: 'What voices do I have on Runway?' } }),
      createTestState(),
    );
    expect(ok).toBe(true);
  });

  it('RUNWAY_START_CHARACTER_SESSION does not match listing Runway characters (plural)', async () => {
    const bad = await startCharacterAction.validate?.(
      runtime,
      createTestMemory({ content: { text: 'List my Runway characters' } }),
      createTestState(),
    );
    expect(bad).toBe(false);
  });

  it('RUNWAY_LIST_AVATARS validates for list my runway characters', async () => {
    const ok = await listAvatarsManagementAction.validate?.(
      runtime,
      createTestMemory({ content: { text: 'List my Runway characters' } }),
      createTestState(),
    );
    expect(ok).toBe(true);
  });

  it('RUNWAY_GET_AVATAR validates when detail intent and id present with Runway context', async () => {
    const ok = await getAvatarManagementAction.validate?.(
      runtime,
      createTestMemory({
        content: {
          text: 'Show schema for Runway avatar avatarId:a1b2c3d4-e5f6-4a5b-8c9d-ef1234567890',
        },
      }),
      createTestState(),
    );
    expect(ok).toBe(true);
  });

  it('RUNWAY_LIST_WORKFLOWS validates on keywords', async () => {
    const ok = await listWorkflowsAction.validate?.(
      runtime,
      createTestMemory({ content: { text: 'list runway workflows' } }),
      createTestState(),
    );
    expect(ok).toBe(true);
  });

  it('RUNWAY_LIST_WORKFLOWS validates on natural phrasing with Runway in message', async () => {
    const ok = await listWorkflowsAction.validate?.(
      runtime,
      createTestMemory({ content: { text: 'Get me my Runway workflows' } }),
      createTestState(),
    );
    expect(ok).toBe(true);
  });

  it('RUNWAY_LIST_WORKFLOWS validates when state mentions Runway but message is short', async () => {
    const ok = await listWorkflowsAction.validate?.(
      runtime,
      createTestMemory({ content: { text: 'What workflows do I have?' } }),
      createTestState({ text: 'Earlier you asked about the Runway developer API.' }),
    );
    expect(ok).toBe(true);
  });

  it('RUNWAY_LIST_WORKFLOWS does not validate for generic workflows without Runway context', async () => {
    const bad = await listWorkflowsAction.validate?.(
      runtime,
      createTestMemory({ content: { text: 'What workflows do I have in GitHub Actions?' } }),
      createTestState({ text: 'CI and linting.' }),
    );
    expect(bad).toBe(false);
  });

  it('RUNWAY_GET_WORKFLOW validates when detail intent and id present with Runway context', async () => {
    const ok = await getWorkflowAction.validate?.(
      runtime,
      createTestMemory({
        content: {
          text: 'Show schema for Runway workflow workflowId:a1b2c3d4-e5f6-4a5b-8c9d-ef1234567890',
        },
      }),
      createTestState(),
    );
    expect(ok).toBe(true);
  });

  it('RUNWAY_RUN_WORKFLOW validates on natural run + Runway context', async () => {
    const ok = await runWorkflowAction.validate?.(
      runtime,
      createTestMemory({
        content: { text: 'Please run this Runway workflow workflowId:a1b2c3d4-e5f6-4a5b-8c9d-ef1234567890' },
      }),
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

describe('RunwayManagementService', () => {
  it('start/stop lifecycle', async () => {
    const runtime = createMockRuntime({
      getSetting: () => 'test-runway-secret',
    });
    const svc = await RunwayManagementService.start(runtime);
    expect(svc).toBeInstanceOf(RunwayManagementService);
    expect(RunwayManagementService.serviceType).toBe('runway-management');

    const withSvc = createMockRuntime({
      getSetting: () => 'test-runway-secret',
      getService: ((t: string) => (t === 'runway-management' ? svc : null)) as IAgentRuntime['getService'],
    });
    await RunwayManagementService.stop(withSvc);
  });
});

describe('RUNWAY_GET_ORGANIZATION handler', () => {
  it('returns summary with mocked management service', async () => {
    const mgmt = {
      retrieveOrganization: async () => ({
        creditBalance: 500,
        tier: {
          maxMonthlyCreditSpend: 10000,
          models: { 'gen4.5': { maxConcurrentGenerations: 2, maxDailyGenerations: 200 } },
        },
        usage: { models: { 'gen4.5': { dailyGenerations: 3 } } },
      }),
    };
    const runtime = createMockRuntime({
      getSetting: () => 'test-runway-secret',
      getService: ((t: string) => (t === RunwayManagementService.serviceType ? mgmt : null)) as IAgentRuntime['getService'],
    });

    const result = await getOrganizationAction.handler!(
      runtime,
      createTestMemory({ content: { text: 'runway credits balance' } }),
      createTestState(),
      undefined,
      undefined,
    );
    expect(result.success).toBe(true);
    expect(result.text).toContain('500');
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
