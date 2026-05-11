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
  extractPromptAfterKeyword,
  hasVoiceIdInMessage,
  matchesAny,
  normalizeText,
  parseKeyValuePairs,
  runwayContext,
  voiceDetailIntent,
  voiceListIntent,
} from '../lib/actionHelpers.ts';
import { formatVoiceListItems } from '../lib/managementHelpers.ts';
import { RunwayManagementService } from '../services/RunwayManagementService.ts';

const LIST_TRIGGERS = [
  'list runway voices',
  'runway list voices',
  'runway voices',
  'show runway voices',
  'get runway voices',
  'my runway voices',
];

const VOICE_UUID_RE =
  /\b[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}\b/i;

const listVoicesExamples: ActionExample[][] = [
  [
    { name: '{{user}}', content: { text: 'What custom voices do I have on Runway?' } },
    { name: '{{agent}}', content: { text: 'Listing your Runway voices.', actions: ['RUNWAY_LIST_VOICES'] } },
  ],
  [
    { name: '{{user}}', content: { text: 'Show me my Runway voices' } },
    { name: '{{agent}}', content: { text: 'Here are your custom voices…', actions: ['RUNWAY_LIST_VOICES'] } },
  ],
];

const getVoiceExamples: ActionExample[][] = [
  [
    {
      name: '{{user}}',
      content: {
        text: 'Get Runway voice voiceId:a1b2c3d4-e5f6-7890-abcd-ef1234567890',
      },
    },
    {
      name: '{{agent}}',
      content: { text: 'Here is the voice record…', actions: ['RUNWAY_GET_VOICE'] },
    },
  ],
];

const CREATE_TRIGGERS = ['create runway voice', 'runway create voice'];
const GET_TRIGGERS = [
  'get runway voice',
  'runway voice details',
  'fetch runway voice',
  'show runway voice details',
];

export const listVoicesAction: Action = {
  name: 'RUNWAY_LIST_VOICES',
  similes: ['RUNWAY_VOICES_LIST'],
  description:
    'Lists custom voices for the Runway organization via the API. Use when the user asks to list, show, or fetch their Runway/custom voices. Requires Runway context in the message or recent state unless they match an explicit trigger phrase.',

  examples: listVoicesExamples,

  validate: async (_runtime: IAgentRuntime, message: Memory, state?: State): Promise<boolean> => {
    const t = normalizeText(message);
    if (!t) return false;
    if (matchesAny(t, LIST_TRIGGERS)) return true;
    return voiceListIntent(t) && runwayContext(message, state);
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

      const items = (await mgmt.listVoices(100)) as unknown[];
      const summary = formatVoiceListItems(items);
      if (callback) await callback({ text: summary });
      return { success: true, text: summary, data: { actionName: 'RUNWAY_LIST_VOICES', voices: items } };
    } catch (error) {
      const msg = error instanceof Error ? error.message : String(error);
      logger.error('[RUNWAY_LIST_VOICES]', msg);
      if (callback) await callback({ text: `Runway voices error: ${msg}`, error: true });
      return { success: false, text: msg, error: error instanceof Error ? error : new Error(msg) };
    }
  },
};

export const createVoiceAction: Action = {
  name: 'RUNWAY_CREATE_VOICE',
  similes: ['RUNWAY_VOICE_CREATE'],
  description:
    'Creates a custom Runway voice from text description or audio URL. Triggers: create runway voice. Required: name:... Either prompt:"..." (20+ chars, text design) with optional model:eleven_ttv_v3 or audio:https://... (clone).',

  validate: async (_runtime: IAgentRuntime, message: Memory): Promise<boolean> => {
    const t = normalizeText(message);
    return !!t && matchesAny(t, CREATE_TRIGGERS);
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
      const name = kv.name;
      if (!name) {
        const err = 'Provide name:VoiceName';
        if (callback) await callback({ text: err, error: true });
        return { success: false, text: err, error: new Error(err) };
      }

      const description = kv.description ?? null;
      const audioUri = kv.audio || kv.audiouri;
      let prompt =
        kv.prompt ||
        extractPromptAfterKeyword(raw, [...CREATE_TRIGGERS]).replace(/^["']|["']$/g, '').trim();

      if (audioUri) {
        const created = await mgmt.createVoice({
          name,
          description: description ?? undefined,
          from: { type: 'audio', audio: audioUri },
        });
        const summary = `**Voice created (clone)** id: \`${created.id}\``;
        if (callback) await callback({ text: summary });
        return { success: true, text: summary, data: { actionName: 'RUNWAY_CREATE_VOICE', id: created.id } };
      }

      if (!prompt || prompt.length < 20) {
        const err = 'For text-based voice design provide prompt:"..." with at least 20 characters, or audio:https://... to clone.';
        if (callback) await callback({ text: err, error: true });
        return { success: false, text: err, error: new Error(err) };
      }

      const modelRaw = (kv.model || 'eleven_ttv_v3').toLowerCase();
      const model =
        modelRaw === 'eleven_multilingual_ttv_v2' ? 'eleven_multilingual_ttv_v2' : 'eleven_ttv_v3';

      const created = await mgmt.createVoice({
        name,
        description: description ?? undefined,
        from: { type: 'text', model, prompt },
      });
      const summary = `**Voice creation started** id: \`${created.id}\` (poll with "get runway voice" voiceId:${created.id})`;
      if (callback) await callback({ text: summary });
      return { success: true, text: summary, data: { actionName: 'RUNWAY_CREATE_VOICE', id: created.id } };
    } catch (error) {
      const msg = error instanceof Error ? error.message : String(error);
      logger.error('[RUNWAY_CREATE_VOICE]', msg);
      if (callback) await callback({ text: `Runway create voice error: ${msg}`, error: true });
      return { success: false, text: msg, error: error instanceof Error ? error : new Error(msg) };
    }
  },
};

export const getVoiceAction: Action = {
  name: 'RUNWAY_GET_VOICE',
  similes: ['RUNWAY_VOICE_GET'],
  description:
    'Gets one Runway custom voice by id. User should provide voiceId:uuid or id:uuid with voice context (or paste the UUID).',

  examples: getVoiceExamples,

  validate: async (_runtime: IAgentRuntime, message: Memory, state?: State): Promise<boolean> => {
    const t = normalizeText(message);
    if (!t) return false;
    if (matchesAny(t, GET_TRIGGERS)) return true;
    if (!runwayContext(message, state)) return false;
    if (!voiceDetailIntent(t)) return false;
    return hasVoiceIdInMessage(t);
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
      let id = kv.voiceid || kv.id;
      if (!id) {
        const m = raw.match(VOICE_UUID_RE);
        id = m?.[0] ?? '';
      }
      if (!id) {
        const err = 'Provide voiceId:...';
        if (callback) await callback({ text: err, error: true });
        return { success: false, text: err, error: new Error(err) };
      }

      const voice = await mgmt.retrieveVoice(id);
      const summary = [
        '## Runway voice',
        '```json',
        JSON.stringify(voice, null, 2),
        '```',
      ].join('\n');
      if (callback) await callback({ text: summary });
      return { success: true, text: summary, data: { actionName: 'RUNWAY_GET_VOICE', voice } };
    } catch (error) {
      const msg = error instanceof Error ? error.message : String(error);
      logger.error('[RUNWAY_GET_VOICE]', msg);
      if (callback) await callback({ text: `Runway get voice error: ${msg}`, error: true });
      return { success: false, text: msg, error: error instanceof Error ? error : new Error(msg) };
    }
  },
};
