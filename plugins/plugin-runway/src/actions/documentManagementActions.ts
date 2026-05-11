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
  documentDetailIntent,
  documentListIntent,
  extractPromptAfterKeyword,
  hasDocumentIdInMessage,
  matchesAny,
  normalizeText,
  parseKeyValuePairs,
  runwayContext,
} from '../lib/actionHelpers.ts';
import {
  confirmDeleteApproved,
  formatDocumentListItems,
  truncateText,
} from '../lib/managementHelpers.ts';
import { RunwayManagementService } from '../services/RunwayManagementService.ts';

const LIST_TRIGGERS = [
  'list runway documents',
  'runway list documents',
  'runway documents',
  'show runway documents',
  'get runway documents',
  'my runway documents',
];

const DOC_UUID_RE =
  /\b[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}\b/i;

const listDocumentsExamples: ActionExample[][] = [
  [
    { name: '{{user}}', content: { text: 'List my Runway knowledge documents' } },
    {
      name: '{{agent}}',
      content: { text: 'Here are your Runway documents…', actions: ['RUNWAY_LIST_DOCUMENTS'] },
    },
  ],
  [
    { name: '{{user}}', content: { text: 'What documents do I have on Runway?' } },
    { name: '{{agent}}', content: { text: 'Listing your documents.', actions: ['RUNWAY_LIST_DOCUMENTS'] } },
  ],
];

const getDocumentExamples: ActionExample[][] = [
  [
    {
      name: '{{user}}',
      content: {
        text: 'Show Runway document documentId:a1b2c3d4-e5f6-7890-abcd-ef1234567890',
      },
    },
    {
      name: '{{agent}}',
      content: { text: 'Here is the document…', actions: ['RUNWAY_GET_DOCUMENT'] },
    },
  ],
];

const CREATE_TRIGGERS = ['create runway document', 'runway create document'];
const GET_TRIGGERS = [
  'get runway document',
  'runway document details',
  'fetch runway document',
  'show runway document details',
];
const DELETE_TRIGGERS = ['delete runway document', 'runway delete document'];

export const createDocumentAction: Action = {
  name: 'RUNWAY_CREATE_DOCUMENT',
  similes: ['RUNWAY_DOCUMENT_CREATE'],
  description:
    'Creates a Runway knowledge document (markdown/plain text). Triggers: create runway document. Required: name:... content:... (or body text after trigger). Optional: avatarId: to attach to an avatar after create.',

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
      let content =
        kv.content ||
        extractPromptAfterKeyword(raw, CREATE_TRIGGERS).replace(/^content\s*:/i, '').trim();

      if (!name || !content) {
        const err = 'Provide name:... and content:... (or place document text after the trigger).';
        if (callback) await callback({ text: err, error: true });
        return { success: false, text: err, error: new Error(err) };
      }

      const doc = await mgmt.createDocument({ name, content });
      let summary = `**Document created** id: \`${doc.id}\` name: ${doc.name}`;

      const avatarId = kv.avatarid || kv.avatar_id;
      if (avatarId) {
        const avatar = await mgmt.retrieveAvatar(avatarId);
        const existing =
          typeof avatar === 'object' && avatar && 'documentIds' in avatar && Array.isArray(avatar.documentIds)
            ? (avatar.documentIds as string[])
            : [];
        const next = [...existing, doc.id];
        await mgmt.updateAvatar(avatarId, { documentIds: next });
        summary += `\n\nAttached to avatar \`${avatarId}\` (${next.length} total documents).`;
      }

      if (callback) await callback({ text: summary });
      return {
        success: true,
        text: summary,
        data: { actionName: 'RUNWAY_CREATE_DOCUMENT', document: doc, avatarId: avatarId || null },
      };
    } catch (error) {
      const msg = error instanceof Error ? error.message : String(error);
      logger.error('[RUNWAY_CREATE_DOCUMENT]', msg);
      if (callback) await callback({ text: `Runway create document error: ${msg}`, error: true });
      return { success: false, text: msg, error: error instanceof Error ? error : new Error(msg) };
    }
  },
};

export const listDocumentsAction: Action = {
  name: 'RUNWAY_LIST_DOCUMENTS',
  similes: ['RUNWAY_DOCUMENTS_LIST'],
  description:
    'Lists Runway knowledge documents via the API. Use when the user asks to list, show, or fetch their Runway documents/knowledge base items. Requires Runway context in the message or recent state unless they match an explicit trigger phrase.',

  examples: listDocumentsExamples,

  validate: async (_runtime: IAgentRuntime, message: Memory, state?: State): Promise<boolean> => {
    const t = normalizeText(message);
    if (!t) return false;
    if (matchesAny(t, LIST_TRIGGERS)) return true;
    return documentListIntent(t) && runwayContext(message, state);
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

      const items = (await mgmt.listDocuments(100)) as unknown[];
      const summary = formatDocumentListItems(items);
      if (callback) await callback({ text: summary });
      return { success: true, text: summary, data: { actionName: 'RUNWAY_LIST_DOCUMENTS', documents: items } };
    } catch (error) {
      const msg = error instanceof Error ? error.message : String(error);
      logger.error('[RUNWAY_LIST_DOCUMENTS]', msg);
      if (callback) await callback({ text: `Runway documents error: ${msg}`, error: true });
      return { success: false, text: msg, error: error instanceof Error ? error : new Error(msg) };
    }
  },
};

export const getDocumentAction: Action = {
  name: 'RUNWAY_GET_DOCUMENT',
  similes: ['RUNWAY_DOCUMENT_GET'],
  description:
    'Gets one Runway knowledge document including content. User should provide documentId:uuid or id:uuid with document context (or paste the UUID).',

  examples: getDocumentExamples,

  validate: async (_runtime: IAgentRuntime, message: Memory, state?: State): Promise<boolean> => {
    const t = normalizeText(message);
    if (!t) return false;
    if (matchesAny(t, GET_TRIGGERS)) return true;
    if (!runwayContext(message, state)) return false;
    if (!documentDetailIntent(t)) return false;
    return hasDocumentIdInMessage(t);
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
      let id = kv.documentid || kv.id;
      if (!id) {
        const m = raw.match(DOC_UUID_RE);
        id = m?.[0] ?? '';
      }
      if (!id) {
        const err = 'Provide documentId:...';
        if (callback) await callback({ text: err, error: true });
        return { success: false, text: err, error: new Error(err) };
      }

      const doc = await mgmt.retrieveDocument(id);
      const rec = doc as Record<string, unknown>;
      const content = typeof rec.content === 'string' ? truncateText(rec.content) : '';
      const { content: _c, ...meta } = rec;
      const summary = [
        '## Runway document',
        '```json',
        JSON.stringify(meta, null, 2),
        '```',
        '',
        '### Content',
        content,
      ].join('\n');

      if (callback) await callback({ text: summary });
      return { success: true, text: summary, data: { actionName: 'RUNWAY_GET_DOCUMENT', document: doc } };
    } catch (error) {
      const msg = error instanceof Error ? error.message : String(error);
      logger.error('[RUNWAY_GET_DOCUMENT]', msg);
      if (callback) await callback({ text: `Runway get document error: ${msg}`, error: true });
      return { success: false, text: msg, error: error instanceof Error ? error : new Error(msg) };
    }
  },
};

export const deleteDocumentAction: Action = {
  name: 'RUNWAY_DELETE_DOCUMENT',
  similes: ['RUNWAY_DOCUMENT_DELETE'],
  description:
    'Deletes a Runway document. Triggers: delete runway document. Required: documentId and confirm:true or "confirm delete".',

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
      const id = kv.documentid || kv.id;
      if (!id) {
        const err = 'Provide documentId:...';
        if (callback) await callback({ text: err, error: true });
        return { success: false, text: err, error: new Error(err) };
      }

      if (!confirmDeleteApproved(raw, kv)) {
        const err = 'Deletion blocked. Add confirm:true or say "confirm delete" in the same message.';
        if (callback) await callback({ text: err, error: true });
        return { success: false, text: err, error: new Error(err) };
      }

      await mgmt.deleteDocument(id);
      const summary = `**Deleted document** \`${id}\``;
      if (callback) await callback({ text: summary });
      return { success: true, text: summary, data: { actionName: 'RUNWAY_DELETE_DOCUMENT', documentId: id } };
    } catch (error) {
      const msg = error instanceof Error ? error.message : String(error);
      logger.error('[RUNWAY_DELETE_DOCUMENT]', msg);
      if (callback) await callback({ text: `Runway delete document error: ${msg}`, error: true });
      return { success: false, text: msg, error: error instanceof Error ? error : new Error(msg) };
    }
  },
};
