import {
  type Content,
  type HandlerCallback,
  type IAgentRuntime,
  type TestSuite,
} from '@elizaos/core';
import { generateVideoAction } from '../../index';
import { RunwayService, MediaProcessingService, RunwayManagementService } from '../../index';

type UUID = `${string}-${string}-${string}-${string}-${string}`;

interface Memory {
  entityId: UUID;
  roomId: UUID;
  content: {
    text: string;
    source: string;
    actions?: string[];
  };
}

interface State {
  values: Record<string, unknown>;
  data: Record<string, unknown>;
  text: string;
}

/**
 * E2E suite for `plugin-runway` when loaded in an ElizaOS test runtime.
 * Assertions throw `Error` on failure (ElizaOS e2e runner convention).
 */
export const RunwayPluginTestSuite: TestSuite = {
  name: 'plugin_runway_test_suite',
  tests: [
    {
      name: 'runway_services_registered',
      fn: async (runtime: IAgentRuntime) => {
        const runway = runtime.getService(RunwayService.serviceType);
        const media = runtime.getService(MediaProcessingService.serviceType);
        const mgmt = runtime.getService(RunwayManagementService.serviceType);
        if (!runway) throw new Error('RunwayService (runway) not found');
        if (!media) throw new Error('MediaProcessingService (runway-media) not found');
        if (!mgmt) throw new Error('RunwayManagementService (runway-management) not found');
      },
    },
    {
      name: 'runway_actions_registered',
      fn: async (runtime: IAgentRuntime) => {
        const names = new Set((runtime.actions ?? []).map((a) => a.name));
        if (!names.has('RUNWAY_GENERATE_VIDEO')) throw new Error('RUNWAY_GENERATE_VIDEO missing');
        if (!names.has('RUNWAY_START_CHARACTER_SESSION')) throw new Error('RUNWAY_START_CHARACTER_SESSION missing');
        if (!names.has('RUNWAY_GET_ORGANIZATION')) throw new Error('RUNWAY_GET_ORGANIZATION missing');
      },
    },
    {
      name: 'runway_status_provider',
      fn: async (runtime: IAgentRuntime) => {
        const p = runtime.providers?.find((x) => x.name === 'RUNWAY_STATUS');
        if (!p) throw new Error('RUNWAY_STATUS provider missing');
        const msg: Memory = {
          entityId: '12345678-1234-1234-1234-123456789012' as UUID,
          roomId: '12345678-1234-1234-1234-123456789012' as UUID,
          content: { text: 'ctx', source: 'test' },
        };
        const st: State = { values: {}, data: {}, text: '' };
        const r = await p.get(runtime, msg as never, st as never);
        if (!r.text?.includes('Runway')) throw new Error('Unexpected provider text');
      },
    },
    {
      name: 'runway_generate_video_action_smoke',
      fn: async (runtime: IAgentRuntime) => {
        const origGet = runtime.getService.bind(runtime);
        const runwayStub = {
          getApiSecret: () => 'e2e-test-key',
          startGen45Video: async () => ({ id: 'e2e_task' }),
        };
        const mediaStub = {
          waitForTask: async () => ({
            status: 'SUCCEEDED' as const,
            output: ['https://example.com/video.mp4'],
          }),
        };
        try {
          (runtime as { getService: typeof runtime.getService }).getService = ((type: string) => {
            if (type === RunwayService.serviceType) return runwayStub as never;
            if (type === MediaProcessingService.serviceType) return mediaStub as never;
            return origGet(type);
          }) as typeof runtime.getService;

          const testMessage: Memory = {
            entityId: '12345678-1234-1234-1234-123456789012' as UUID,
            roomId: '12345678-1234-1234-1234-123456789012' as UUID,
            content: { text: 'generate video: soft rain', source: 'test' },
          };
          const testState: State = { values: {}, data: {}, text: '' };
          let saw = '';
          const cb: HandlerCallback = async (c: Content) => {
            saw += c.text ?? '';
            return [];
          };
          const result = await generateVideoAction.handler!(
            runtime,
            testMessage as never,
            testState as never,
            {},
            cb,
          );
          if (!result.success) throw new Error(String((result as { text?: string }).text));
          if (!saw.toLowerCase().includes('runway')) throw new Error('Callback did not mention Runway');
        } finally {
          (runtime as { getService: typeof runtime.getService }).getService = origGet;
        }
      },
    },
  ],
};

export default RunwayPluginTestSuite;
