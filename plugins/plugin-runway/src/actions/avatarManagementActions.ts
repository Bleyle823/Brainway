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
  avatarDetailIntent,
  avatarListIntent,
  extractPromptAfterKeyword,
  hasAvatarIdInMessage,
  matchesAny,
  normalizeText,
  parseKeyValuePairs,
  runwayContext,
} from '../lib/actionHelpers.ts';
import {
  confirmDeleteApproved,
  formatAvatarListItems,
  parseCommaIds,
} from '../lib/managementHelpers.ts';
import { RunwayManagementService } from '../services/RunwayManagementService.ts';

const LIST_TRIGGERS = [
  'list runway avatars',
  'runway list avatars',
  'runway avatars',
  'show runway avatars',
  'get runway avatars',
  'my runway avatars',
];

const AVATAR_UUID_RE =
  /\b[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}\b/i;

const listAvatarsExamples: ActionExample[][] = [
  [
    { name: '{{user}}', content: { text: 'Get me my Runway avatars' } },
    { name: '{{agent}}', content: { text: 'Here are your Runway avatars…', actions: ['RUNWAY_LIST_AVATARS'] } },
  ],
  [
    { name: '{{user}}', content: { text: 'What avatars do I have on Runway?' } },
    { name: '{{agent}}', content: { text: 'Listing your Runway avatars.', actions: ['RUNWAY_LIST_AVATARS'] } },
  ],
];

const getAvatarExamples: ActionExample[][] = [
  [
    {
      name: '{{user}}',
      content: {
        text: 'Show details for Runway avatar avatarId:a1b2c3d4-e5f6-7890-abcd-ef1234567890',
      },
    },
    {
      name: '{{agent}}',
      content: { text: 'Here is the avatar metadata…', actions: ['RUNWAY_GET_AVATAR'] },
    },
  ],
];

const CREATE_TRIGGERS = ['create runway avatar', 'runway create avatar'];
const GET_TRIGGERS = [
  'get runway avatar',
  'runway avatar details',
  'fetch runway avatar',
  'show runway avatar details',
];
const UPDATE_TRIGGERS = ['update runway avatar', 'runway update avatar'];
const DELETE_TRIGGERS = ['delete runway avatar', 'runway delete avatar'];
const LINK_TRIGGERS = ['link runway documents', 'runway link documents', 'runway attach documents'];

function voiceFromKv(kv: Record<string, string>):
  | { type: 'runway-live-preset'; presetId: string }
  | { type: 'custom'; id: string } {
  const customId = kv.voicecustomid || kv.customvoiceid || kv.customvoice;
  if (customId) {
    return { type: 'custom', id: customId };
  }
  const preset = kv.voicepreset || kv.presetid || 'clara';
  return { type: 'runway-live-preset', presetId: preset };
}

export const listAvatarsManagementAction: Action = {
  name: 'RUNWAY_LIST_AVATARS',
  similes: ['RUNWAY_AVATARS_LIST'],
  description:
    'Lists Runway Characters avatars via the API. Use when the user asks to list, show, or fetch their Runway avatars/characters, or what avatars they have on Runway. Requires Runway context in the message or recent state, unless they match an explicit trigger phrase.',

  examples: listAvatarsExamples,

  validate: async (_runtime: IAgentRuntime, message: Memory, state?: State): Promise<boolean> => {
    const t = normalizeText(message);
    if (!t) return false;
    if (matchesAny(t, LIST_TRIGGERS)) return true;
    return avatarListIntent(t) && runwayContext(message, state);
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

      const items = (await mgmt.listAvatars(100)) as unknown[];
      const summary = formatAvatarListItems(items);
      if (callback) await callback({ text: summary });
      return { success: true, text: summary, data: { actionName: 'RUNWAY_LIST_AVATARS', avatars: items } };
    } catch (error) {
      const msg = error instanceof Error ? error.message : String(error);
      logger.error('[RUNWAY_LIST_AVATARS]', msg);
      if (callback) await callback({ text: `Runway avatars error: ${msg}`, error: true });
      return { success: false, text: msg, error: error instanceof Error ? error : new Error(msg) };
    }
  },
};

export const createAvatarManagementAction: Action = {
  name: 'RUNWAY_CREATE_AVATAR',
  similes: ['RUNWAY_AVATAR_CREATE'],
  description:
    'Creates a Runway avatar. Triggers: create runway avatar. Required: name referenceImage personality. Use key:value: name:... referenceImage:https://... voicePreset:clara personality:"..." Optional: startScript documentIds:id1,id2 imageProcessing:none',

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
      const referenceImage = kv.referenceimage || kv.image || kv.uri;
      const personality =
        kv.personality ||
        kv.persona ||
        extractPromptAfterKeyword(raw, CREATE_TRIGGERS).replace(/^personality\s*:/i, '').trim();

      if (!name || !referenceImage || !personality) {
        const err =
          'Provide name:, referenceImage: (URL or data URI), and personality: (or text after the trigger).';
        if (callback) await callback({ text: err, error: true });
        return { success: false, text: err, error: new Error(err) };
      }

      const documentIds = parseCommaIds(kv.documentids);
      const startScript = kv.startscript;
      const imageProcessing = kv.imageprocessing?.toLowerCase() === 'none' ? 'none' : 'optimize';

      const created = await mgmt.createAvatar({
        name,
        referenceImage,
        personality,
        voice: voiceFromKv(kv),
        ...(documentIds ? { documentIds } : {}),
        ...(startScript ? { startScript } : {}),
        imageProcessing,
      });

      const st = typeof created === 'object' && created && 'status' in created ? String(created.status) : 'unknown';
      const summary = `**Avatar created** id: \`${created.id}\` status: \`${st}\``;
      if (callback) await callback({ text: summary });
      return { success: true, text: summary, data: { actionName: 'RUNWAY_CREATE_AVATAR', avatar: created } };
    } catch (error) {
      const msg = error instanceof Error ? error.message : String(error);
      logger.error('[RUNWAY_CREATE_AVATAR]', msg);
      if (callback) await callback({ text: `Runway create avatar error: ${msg}`, error: true });
      return { success: false, text: msg, error: error instanceof Error ? error : new Error(msg) };
    }
  },
};

export const getAvatarManagementAction: Action = {
  name: 'RUNWAY_GET_AVATAR',
  similes: ['RUNWAY_AVATAR_GET'],
  description:
    'Gets one Runway avatar (metadata) from the API. Use when the user wants details for a specific Runway avatar. They should provide avatarId:uuid or id:uuid (or paste the UUID).',

  examples: getAvatarExamples,

  validate: async (_runtime: IAgentRuntime, message: Memory, state?: State): Promise<boolean> => {
    const t = normalizeText(message);
    if (!t) return false;
    if (matchesAny(t, GET_TRIGGERS)) return true;
    if (!runwayContext(message, state)) return false;
    if (!avatarDetailIntent(t)) return false;
    return hasAvatarIdInMessage(t);
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
      let id = kv.avatarid || kv.id;
      if (!id) {
        const m = raw.match(AVATAR_UUID_RE);
        id = m?.[0] ?? '';
      }
      if (!id) {
        const err = 'Provide avatarId:...';
        if (callback) await callback({ text: err, error: true });
        return { success: false, text: err, error: new Error(err) };
      }

      const avatar = await mgmt.retrieveAvatar(id);
      const summary = ['## Runway avatar', '```json', JSON.stringify(avatar, null, 2), '```'].join('\n');
      if (callback) await callback({ text: summary });
      return { success: true, text: summary, data: { actionName: 'RUNWAY_GET_AVATAR', avatar } };
    } catch (error) {
      const msg = error instanceof Error ? error.message : String(error);
      logger.error('[RUNWAY_GET_AVATAR]', msg);
      if (callback) await callback({ text: `Runway get avatar error: ${msg}`, error: true });
      return { success: false, text: msg, error: error instanceof Error ? error : new Error(msg) };
    }
  },
};

export const updateAvatarManagementAction: Action = {
  name: 'RUNWAY_UPDATE_AVATAR',
  similes: ['RUNWAY_AVATAR_UPDATE'],
  description:
    'Updates a Runway avatar. Triggers: update runway avatar. Required: avatarId plus fields to change: name personality voicePreset voiceCustomId referenceImage startScript documentIds imageProcessing',

  validate: async (_runtime: IAgentRuntime, message: Memory): Promise<boolean> => {
    const t = normalizeText(message);
    return !!t && matchesAny(t, UPDATE_TRIGGERS);
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
      const id = kv.avatarid || kv.id;
      if (!id) {
        const err = 'Provide avatarId:...';
        if (callback) await callback({ text: err, error: true });
        return { success: false, text: err, error: new Error(err) };
      }

      const body: Parameters<RunwayManagementService['updateAvatar']>[1] = {};

      if (kv.name) body.name = kv.name;
      if (kv.personality || kv.persona) body.personality = kv.personality || kv.persona;
      if (kv.referenceimage || kv.image) body.referenceImage = kv.referenceimage || kv.image;
      if (kv.startscript !== undefined) body.startScript = kv.startscript || null;
      if (kv.imageprocessing?.toLowerCase() === 'none') body.imageProcessing = 'none';
      if (kv.imageprocessing?.toLowerCase() === 'optimize') body.imageProcessing = 'optimize';

      const docs = parseCommaIds(kv.documentids);
      if (docs) body.documentIds = docs;

      if (kv.voicepreset || kv.presetid || kv.voicecustomid || kv.customvoiceid || kv.customvoice) {
        body.voice = voiceFromKv(kv);
      }

      if (Object.keys(body).length === 0) {
        const err = 'Provide at least one field to update (name, personality, voicePreset, …).';
        if (callback) await callback({ text: err, error: true });
        return { success: false, text: err, error: new Error(err) };
      }

      const avatar = await mgmt.updateAvatar(id, body);
      const summary = `**Avatar updated** \`${id}\`\n\n\`\`\`json\n${JSON.stringify(avatar, null, 2)}\n\`\`\``;
      if (callback) await callback({ text: summary });
      return { success: true, text: summary, data: { actionName: 'RUNWAY_UPDATE_AVATAR', avatar } };
    } catch (error) {
      const msg = error instanceof Error ? error.message : String(error);
      logger.error('[RUNWAY_UPDATE_AVATAR]', msg);
      if (callback) await callback({ text: `Runway update avatar error: ${msg}`, error: true });
      return { success: false, text: msg, error: error instanceof Error ? error : new Error(msg) };
    }
  },
};

export const deleteAvatarManagementAction: Action = {
  name: 'RUNWAY_DELETE_AVATAR',
  similes: ['RUNWAY_AVATAR_DELETE'],
  description:
    'Deletes a Runway avatar. Triggers: delete runway avatar. Required: avatarId and confirm:true or phrase "confirm delete".',

  validate: async (_runtime: IAgentRuntime, message: Memory): Promise<boolean> => {
    const t = normalizeText(message);
    return !!t && matchesAny(t, DELETE_TRIGGERS);
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
      const id = kv.avatarid || kv.id;
      if (!id) {
        const err = 'Provide avatarId:...';
        if (callback) await callback({ text: err, error: true });
        return { success: false, text: err, error: new Error(err) };
      }

      if (!confirmDeleteApproved(raw, kv)) {
        const err = 'Deletion blocked. Add confirm:true or say "confirm delete" in the same message.';
        if (callback) await callback({ text: err, error: true });
        return { success: false, text: err, error: new Error(err) };
      }

      await mgmt.deleteAvatar(id);
      const summary = `**Deleted avatar** \`${id}\``;
      if (callback) await callback({ text: summary });
      return { success: true, text: summary, data: { actionName: 'RUNWAY_DELETE_AVATAR', avatarId: id } };
    } catch (error) {
      const msg = error instanceof Error ? error.message : String(error);
      logger.error('[RUNWAY_DELETE_AVATAR]', msg);
      if (callback) await callback({ text: `Runway delete avatar error: ${msg}`, error: true });
      return { success: false, text: msg, error: error instanceof Error ? error : new Error(msg) };
    }
  },
};

export const linkAvatarDocumentsAction: Action = {
  name: 'RUNWAY_LINK_AVATAR_DOCUMENTS',
  similes: ['RUNWAY_ATTACH_DOCUMENTS'],
  description:
    'Replaces an avatar knowledge attachments with the given document ids. Triggers: link runway documents. Required: avatarId documentIds:id1,id2 confirm:true',

  validate: async (_runtime: IAgentRuntime, message: Memory): Promise<boolean> => {
    const t = normalizeText(message);
    return !!t && matchesAny(t, LINK_TRIGGERS);
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
      const avatarId = kv.avatarid || kv.id;
      const documentIds = parseCommaIds(kv.documentids);
      if (!avatarId || !documentIds?.length) {
        const err = 'Provide avatarId: and documentIds:id1,id2';
        if (callback) await callback({ text: err, error: true });
        return { success: false, text: err, error: new Error(err) };
      }

      if (!confirmDeleteApproved(raw, kv)) {
        const err = 'This replaces all attached documents. Add confirm:true or "confirm delete" to proceed.';
        if (callback) await callback({ text: err, error: true });
        return { success: false, text: err, error: new Error(err) };
      }

      const avatar = await mgmt.updateAvatar(avatarId, { documentIds });
      const summary = `**Avatar documents linked** \`${avatarId}\` (${documentIds.length} ids).\n\n\`\`\`json\n${JSON.stringify(avatar, null, 2)}\n\`\`\``;
      if (callback) await callback({ text: summary });
      return {
        success: true,
        text: summary,
        data: { actionName: 'RUNWAY_LINK_AVATAR_DOCUMENTS', avatar },
      };
    } catch (error) {
      const msg = error instanceof Error ? error.message : String(error);
      logger.error('[RUNWAY_LINK_AVATAR_DOCUMENTS]', msg);
      if (callback) await callback({ text: `Runway link documents error: ${msg}`, error: true });
      return { success: false, text: msg, error: error instanceof Error ? error : new Error(msg) };
    }
  },
};
