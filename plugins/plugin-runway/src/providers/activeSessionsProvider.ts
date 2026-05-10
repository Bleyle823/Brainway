import type { IAgentRuntime, Memory, Provider, ProviderResult, State } from '@elizaos/core';

/**
 * Placeholder for future session tracking. Characters sessions are short-lived;
 * the agent should persist credentials in memory if follow-up turns need them.
 */
export const activeSessionsProvider: Provider = {
  name: 'RUNWAY_ACTIVE_SESSIONS',
  description: 'Notes about Runway Characters realtime sessions (no persistent session list in-plugin).',

  get: async (_runtime: IAgentRuntime, _message: Memory, _state: State | undefined): Promise<ProviderResult> => {
    const text =
      'Runway Characters: each "start character session" creates a fresh realtime session. ' +
      'WebRTC credentials are returned once; persist them client-side or in agent memory if needed.';

    return {
      text,
      values: {},
      data: {},
    };
  },
};
