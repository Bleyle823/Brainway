import type { IAgentRuntime, Memory, Provider, ProviderResult, State } from '@elizaos/core';
import { getRunwayApiBase, getRunwayApiOrigin } from '../config/runwayConfig.ts';

export const runwayStatusProvider: Provider = {
  name: 'RUNWAY_STATUS',
  description: 'Runway API connectivity hints (base URLs, secret presence — never exposes the secret).',

  get: async (
    _runtime: IAgentRuntime,
    _message: Memory,
    _state: State | undefined,
  ): Promise<ProviderResult> => {
    const hasSecret = Boolean(process.env.RUNWAYML_API_SECRET?.trim());
    const text = [
      'Runway plugin context:',
      `- API origin (SDK): ${getRunwayApiOrigin()}`,
      `- API base (REST): ${getRunwayApiBase()}`,
      `- RUNWAYML_API_SECRET configured: ${hasSecret ? 'yes' : 'no'}`,
      `- Optional: RUNWAYML_API_BASE_URL, RUNWAY_CHARACTER_AVATAR_ID, RUNWAY_CHARACTER_AVATAR_TYPE`,
    ].join('\n');

    return {
      text,
      values: { runwaySecretConfigured: hasSecret },
      data: { apiOrigin: getRunwayApiOrigin(), apiBase: getRunwayApiBase() },
    };
  },
};
