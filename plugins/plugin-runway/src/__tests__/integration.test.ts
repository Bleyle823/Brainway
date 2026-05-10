import { describe, expect, it, beforeEach, beforeAll } from 'bun:test';
import { runwayPlugin, generateVideoAction, RunwayService, MediaProcessingService } from '../index';
import { createMockRuntime, setupLoggerSpies, type MockRuntime } from './test-utils';
import type { HandlerCallback, IAgentRuntime, Memory, State, UUID } from '@elizaos/core';

beforeAll(() => {
  setupLoggerSpies();
});

describe('Integration: video action with Runway + Media services', () => {
  let mockRuntime: MockRuntime;

  beforeEach(() => {
    const runwayMock = {
      getApiSecret: () => 'integration-test-key',
      startGen45Video: async () => ({ id: 'task_integration' }),
    };
    const mediaMock = {
      waitForTask: async () => ({
        status: 'SUCCEEDED' as const,
        output: ['https://cdn.example.com/video.mp4'],
        id: 'task_integration',
      }),
    };

    mockRuntime = createMockRuntime({
      getService: ((type: string) => {
        if (type === RunwayService.serviceType) return runwayMock as never;
        if (type === MediaProcessingService.serviceType) return mediaMock as never;
        return null;
      }) as IAgentRuntime['getService'],
    });
  });

  it('runs generateVideoAction end-to-end with mocked Runway', async () => {
    const mockMessage: Memory = {
      id: '12345678-1234-1234-1234-123456789012' as UUID,
      roomId: '12345678-1234-1234-1234-123456789012' as UUID,
      entityId: '12345678-1234-1234-1234-123456789012' as UUID,
      agentId: '12345678-1234-1234-1234-123456789012' as UUID,
      content: { text: 'generate video: soft rain on leaves', source: 'test' },
      createdAt: Date.now(),
    };

    const callbackCalls: unknown[] = [];
    const callbackFn = ((...args: unknown[]) => {
      callbackCalls.push(args);
    }) as HandlerCallback;

    const result = await generateVideoAction.handler!(
      mockRuntime as IAgentRuntime,
      mockMessage,
      {} as State,
      {},
      callbackFn,
    );

    expect(result.success).toBe(true);
    expect(callbackCalls.length).toBeGreaterThan(0);
  });
});

describe('Integration: plugin init', () => {
  it('initializes without throwing', async () => {
    const mockRuntime = createMockRuntime();
    if (runwayPlugin.init) {
      await expect(runwayPlugin.init({}, mockRuntime as IAgentRuntime)).resolves.toBeUndefined();
    }
  });
});
