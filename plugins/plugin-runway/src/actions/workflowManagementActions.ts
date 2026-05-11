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
  hasWorkflowIdInMessage,
  matchesAny,
  normalizeText,
  parseKeyValuePairs,
  runwayContext,
  workflowDetailIntent,
  workflowListIntent,
  workflowRunIntent,
} from '../lib/actionHelpers.ts';
import { formatWorkflowList } from '../lib/managementHelpers.ts';
import { RunwayManagementService } from '../services/RunwayManagementService.ts';

const LIST_TRIGGERS = [
  'list runway workflows',
  'runway list workflows',
  'runway workflows',
  'show runway workflows',
  'get runway workflows',
  'my runway workflows',
  'published runway workflows',
];

const GET_TRIGGERS = [
  'get runway workflow',
  'runway workflow details',
  'fetch runway workflow',
  'show runway workflow details',
];

const RUN_TRIGGERS = [
  'run runway workflow',
  'run published workflow',
  'runway run workflow',
  'execute runway workflow',
  'invoke runway workflow',
  'start runway workflow',
];

const listExamples: ActionExample[][] = [
  [
    { name: '{{user}}', content: { text: 'Get me my Runway workflows' } },
    { name: '{{agent}}', content: { text: 'Here are your published workflows…', actions: ['RUNWAY_LIST_WORKFLOWS'] } },
  ],
  [
    { name: '{{user}}', content: { text: 'What workflows do I have on Runway?' } },
    { name: '{{agent}}', content: { text: 'Listing your Runway workflows.', actions: ['RUNWAY_LIST_WORKFLOWS'] } },
  ],
];

const getExamples: ActionExample[][] = [
  [
    {
      name: '{{user}}',
      content: {
        text: 'Show schema for my Runway workflow workflowId:a1b2c3d4-e5f6-7890-abcd-ef1234567890',
      },
    },
    {
      name: '{{agent}}',
      content: { text: 'Here is the workflow metadata and graph…', actions: ['RUNWAY_GET_WORKFLOW'] },
    },
  ],
];

const runExamples: ActionExample[][] = [
  [
    {
      name: '{{user}}',
      content: {
        text: 'Run my published Runway workflow workflowId:a1b2c3d4-e5f6-7890-abcd-ef1234567890',
      },
    },
    {
      name: '{{agent}}',
      content: { text: 'Started the workflow run.', actions: ['RUNWAY_RUN_WORKFLOW'] },
    },
  ],
];

export const listWorkflowsAction: Action = {
  name: 'RUNWAY_LIST_WORKFLOWS',
  similes: ['RUNWAY_WORKFLOWS_LIST'],
  description:
    'Lists **published Runway workflows** via the Runway Developer API (not the web dashboard). Use when the user asks to list, show, or fetch their Runway workflows, or what workflows they created on Runway. Requires Runway context in the message or recent state (e.g. they said "Runway" earlier).',

  examples: listExamples,

  validate: async (_runtime: IAgentRuntime, message: Memory, state?: State): Promise<boolean> => {
    const t = normalizeText(message);
    if (!t) return false;
    if (matchesAny(t, LIST_TRIGGERS)) return true;
    return workflowListIntent(t) && runwayContext(message, state);
  },

  handler: async (
    runtime: IAgentRuntime,
    _message: Memory,
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

      const data = await mgmt.listWorkflows();
      const summary = formatWorkflowList(data);
      if (callback) await callback({ text: summary });
      return { success: true, text: summary, data: { actionName: 'RUNWAY_LIST_WORKFLOWS', workflows: data } };
    } catch (error) {
      const msg = error instanceof Error ? error.message : String(error);
      logger.error('[RUNWAY_LIST_WORKFLOWS]', msg);
      if (callback) await callback({ text: `Runway workflows error: ${msg}`, error: true });
      return { success: false, text: msg, error: error instanceof Error ? error : new Error(msg) };
    }
  },
};

export const getWorkflowAction: Action = {
  name: 'RUNWAY_GET_WORKFLOW',
  similes: ['RUNWAY_WORKFLOW_GET'],
  description:
    'Gets one **published Runway workflow** (metadata + graph) from the API. Use when the user wants details, schema, or definition of a specific Runway workflow. They must provide workflowId:uuid or id:uuid in the message (or paste the UUID).',

  examples: getExamples,

  validate: async (_runtime: IAgentRuntime, message: Memory, state?: State): Promise<boolean> => {
    const t = normalizeText(message);
    if (!t) return false;
    if (matchesAny(t, GET_TRIGGERS)) return true;
    if (!runwayContext(message, state)) return false;
    if (!workflowDetailIntent(t)) return false;
    return hasWorkflowIdInMessage(t);
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
      let id = kv.workflowid || kv.id;
      if (!id) {
        const m = raw.match(
          /\b[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}\b/i,
        );
        id = m?.[0] ?? '';
      }
      if (!id) {
        const err = 'Provide workflowId:...';
        if (callback) await callback({ text: err, error: true });
        return { success: false, text: err, error: new Error(err) };
      }

      const wf = await mgmt.retrieveWorkflow(id);
      const graphStr = JSON.stringify(wf.graph, null, 2);
      const summary =
        `## ${wf.name}\n\n**id:** ${wf.id}\n**version:** ${wf.version}\n**description:** ${wf.description ?? '—'}\n\n### graph\n\n\`\`\`json\n${graphStr.slice(0, 8000)}${graphStr.length > 8000 ? '\n…' : ''}\n\`\`\``;
      if (callback) await callback({ text: summary });
      return { success: true, text: summary, data: { actionName: 'RUNWAY_GET_WORKFLOW', workflow: wf } };
    } catch (error) {
      const msg = error instanceof Error ? error.message : String(error);
      logger.error('[RUNWAY_GET_WORKFLOW]', msg);
      if (callback) await callback({ text: `Runway workflow error: ${msg}`, error: true });
      return { success: false, text: msg, error: error instanceof Error ? error : new Error(msg) };
    }
  },
};

export const runWorkflowAction: Action = {
  name: 'RUNWAY_RUN_WORKFLOW',
  similes: ['RUNWAY_WORKFLOW_RUN'],
  description:
    'Runs a **published Runway workflow** via the API (returns an invocation id). Optional: nodeOutputs as JSON. User should include workflowId:uuid or id:uuid.',

  examples: runExamples,

  validate: async (_runtime: IAgentRuntime, message: Memory, state?: State): Promise<boolean> => {
    const t = normalizeText(message);
    if (!t) return false;
    if (matchesAny(t, RUN_TRIGGERS)) return true;
    return runwayContext(message, state) && workflowRunIntent(t);
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
      let id = kv.workflowid || kv.id;
      if (!id) {
        const m = raw.match(
          /\b[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}\b/i,
        );
        id = m?.[0] ?? '';
      }
      if (!id) {
        const err = 'Provide workflowId:...';
        if (callback) await callback({ text: err, error: true });
        return { success: false, text: err, error: new Error(err) };
      }

      let nodeOutputs: Record<string, Record<string, { type: string; value?: unknown; uri?: string }>> | undefined;
      const rawNo = kv.nodeoutputs;
      if (rawNo) {
        try {
          const parsed = JSON.parse(rawNo) as Record<string, Record<string, unknown>>;
          nodeOutputs = parsed as typeof nodeOutputs;
        } catch {
          const err = 'nodeOutputs must be valid JSON (escape quotes in chat or paste compact object).';
          if (callback) await callback({ text: err, error: true });
          return { success: false, text: err, error: new Error(err) };
        }
      }

      const result = await mgmt.runWorkflow(id, nodeOutputs ? { nodeOutputs } : undefined);
      const summary = `**Workflow run started.** Invocation id: \`${result.id}\``;
      if (callback) await callback({ text: summary });
      return { success: true, text: summary, data: { actionName: 'RUNWAY_RUN_WORKFLOW', invocation: result } };
    } catch (error) {
      const msg = error instanceof Error ? error.message : String(error);
      logger.error('[RUNWAY_RUN_WORKFLOW]', msg);
      if (callback) await callback({ text: `Runway run workflow error: ${msg}`, error: true });
      return { success: false, text: msg, error: error instanceof Error ? error : new Error(msg) };
    }
  },
};
