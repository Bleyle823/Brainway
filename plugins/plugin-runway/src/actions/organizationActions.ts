import type {
  Action,
  ActionExample,
  ActionResult,
  HandlerCallback,
  IAgentRuntime,
  Memory,
  State,
} from '@elizaos/core';
import { logger } from '@elizaos/core';
import {
  matchesAny,
  normalizeText,
  orgInfoIntent,
  parseKeyValuePairs,
  runwayContext,
  usageHistoryIntent,
} from '../lib/actionHelpers.ts';
import { formatOrganizationSummary, formatUsageHistorySummary } from '../lib/managementHelpers.ts';
import { RunwayManagementService } from '../services/RunwayManagementService.ts';

const ORG_TRIGGERS = [
  'runway organization',
  'runway org info',
  'runway credits balance',
  'runway account limits',
  'show runway organization',
  'get runway credits',
];

const orgExamples: ActionExample[][] = [
  [
    { name: '{{user}}', content: { text: 'What are my Runway credits and limits?' } },
    {
      name: '{{agent}}',
      content: { text: 'Fetching your Runway organization summary…', actions: ['RUNWAY_GET_ORGANIZATION'] },
    },
  ],
];

const USAGE_TRIGGERS = [
  'runway usage history',
  'runway credit usage',
  'runway usage report',
  'show runway usage',
];

const usageExamples: ActionExample[][] = [
  [
    { name: '{{user}}', content: { text: 'Show my Runway API usage history' } },
    {
      name: '{{agent}}',
      content: { text: 'Here is your Runway usage…', actions: ['RUNWAY_GET_CREDIT_USAGE'] },
    },
  ],
];

export const getOrganizationAction: Action = {
  name: 'RUNWAY_GET_ORGANIZATION',
  similes: ['RUNWAY_ORG_INFO'],
  description:
    'Shows Runway API organization: credit balance, tier limits, per-model usage. Triggers include runway organization, credits balance, or natural questions about Runway credits/limits when Runway is in context.',

  examples: orgExamples,

  validate: async (_runtime: IAgentRuntime, message: Memory, state?: State): Promise<boolean> => {
    const t = normalizeText(message);
    if (!t) return false;
    if (matchesAny(t, ORG_TRIGGERS)) return true;
    return orgInfoIntent(t) && runwayContext(message, state);
  },

  handler: async (
    runtime: IAgentRuntime,
    message: Memory,
    _state: State | undefined,
    _options: unknown,
    callback?: HandlerCallback,
  ): Promise<ActionResult> => {
    try {
      const mgmt = runtime.getService(RunwayManagementService.serviceType) as RunwayManagementService | null;
      if (!mgmt) {
        const err = 'RunwayManagementService is not available.';
        if (callback) await callback({ text: err, error: true });
        return { success: false, text: err, error: new Error(err) };
      }

      const data = await mgmt.retrieveOrganization();
      const summary = formatOrganizationSummary(data);
      logger.info('[RUNWAY_GET_ORGANIZATION] ok');

      if (callback) await callback({ text: summary });
      return {
        success: true,
        text: summary,
        data: { actionName: 'RUNWAY_GET_ORGANIZATION', organization: data },
      };
    } catch (error) {
      const msg = error instanceof Error ? error.message : String(error);
      logger.error('[RUNWAY_GET_ORGANIZATION]', msg);
      if (callback) await callback({ text: `Runway organization error: ${msg}`, error: true });
      return { success: false, text: msg, error: error instanceof Error ? error : new Error(msg) };
    }
  },
};

export const getCreditUsageAction: Action = {
  name: 'RUNWAY_GET_CREDIT_USAGE',
  similes: ['RUNWAY_USAGE_HISTORY'],
  description:
    'Runway credit usage by day and model (up to 90 days). Optional: startDate:YYYY-MM-DD beforeDate:YYYY-MM-DD. Use when the user asks for Runway usage, spend, or history with Runway in context.',

  examples: usageExamples,

  validate: async (_runtime: IAgentRuntime, message: Memory, state?: State): Promise<boolean> => {
    const t = normalizeText(message);
    if (!t) return false;
    if (matchesAny(t, USAGE_TRIGGERS)) return true;
    return usageHistoryIntent(t) && runwayContext(message, state);
  },

  handler: async (
    runtime: IAgentRuntime,
    message: Memory,
    _state: State | undefined,
    _options: unknown,
    callback?: HandlerCallback,
  ): Promise<ActionResult> => {
    try {
      const mgmt = runtime.getService(RunwayManagementService.serviceType) as RunwayManagementService | null;
      if (!mgmt) {
        const err = 'RunwayManagementService is not available.';
        if (callback) await callback({ text: err, error: true });
        return { success: false, text: err, error: new Error(err) };
      }

      const raw = normalizeText(message);
      const kv = parseKeyValuePairs(raw);
      const params: { startDate?: string; beforeDate?: string } = {};
      if (kv.startdate) params.startDate = kv.startdate;
      if (kv.beforedate) params.beforeDate = kv.beforedate;

      const data = await mgmt.retrieveUsage(Object.keys(params).length ? params : undefined);
      const summary = formatUsageHistorySummary(data);
      logger.info('[RUNWAY_GET_CREDIT_USAGE] ok');

      if (callback) await callback({ text: summary });
      return {
        success: true,
        text: summary,
        data: { actionName: 'RUNWAY_GET_CREDIT_USAGE', usage: data },
      };
    } catch (error) {
      const msg = error instanceof Error ? error.message : String(error);
      logger.error('[RUNWAY_GET_CREDIT_USAGE]', msg);
      if (callback) await callback({ text: `Runway usage error: ${msg}`, error: true });
      return { success: false, text: msg, error: error instanceof Error ? error : new Error(msg) };
    }
  },
};
