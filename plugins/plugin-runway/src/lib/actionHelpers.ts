/**
 * Lightweight parsing helpers for natural-language triggers.
 */

import type { Memory, State } from '@elizaos/core';

/** True if text references Runway (brand, API host, common typo). */
export function mentionsRunway(text: string): boolean {
  const t = text.toLowerCase();
  return (
    /\brunway\b/.test(t) ||
    t.includes('runwayml') ||
    /\brun way\b/.test(t) ||
    t.includes('dev.runwayml.com')
  );
}

/** User seems to want a list/catalog of workflows (no specific workflow id in text). */
export function workflowListIntent(text: string): boolean {
  const t = text.toLowerCase();
  if (!/\bworkflow/.test(t)) return false;
  if (hasWorkflowIdInMessage(text)) return false;
  if (/\b(run|execute|invoke|launch)\b/.test(t)) return false;
  if (/\b(detail|details|schema|metadata|graph)\b/.test(t)) return false;
  return /(list|show|get|fetch|see|display|what|tell me|give me|all my|do i have|i have|have i|which|catalog|how many|anything i.?ve created)/i.test(
    t,
  );
}

/** User seems to want one workflow's definition / metadata (or explicitly asks for details). */
export function workflowDetailIntent(text: string): boolean {
  const t = text.toLowerCase();
  if (!/\bworkflow/.test(t)) return false;
  if (/\b(run|execute|invoke|launch)\s+(the\s+)?(published\s+)?workflow\b/.test(t)) return false;
  if (
    /(detail|details|schema|metadata|graph|definition|describe|what is this|look up|lookup|info about|breakdown)/i.test(
      t,
    )
  ) {
    return true;
  }
  return hasWorkflowIdInMessage(text) && /(get|show|fetch|pull|open)\b/i.test(t);
}

/** User seems to want to execute a published workflow. */
export function workflowRunIntent(text: string): boolean {
  const t = text.toLowerCase();
  if (!/\bworkflow/.test(t)) return false;
  return /(run|execute|invoke|start|launch|trigger|fire)/i.test(t);
}

const UUID_IN_TEXT =
  /\b[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}\b/i;

/** workflowId: / id: key-value or a UUID in free text. */
export function hasWorkflowIdInMessage(text: string): boolean {
  const kv = parseKeyValuePairs(text);
  if (kv.workflowid || kv.id) return true;
  return UUID_IN_TEXT.test(text);
}

/** avatarId: / id: with avatar context, or UUID when message mentions avatars/characters. */
export function hasAvatarIdInMessage(text: string): boolean {
  const kv = parseKeyValuePairs(text);
  if (kv.avatarid) return true;
  const t = text.toLowerCase();
  const resource = /\bavatar(s)?\b/.test(t) || /\bcharacter(s)?\b/.test(t);
  if (!resource) return false;
  if (kv.id) return true;
  return UUID_IN_TEXT.test(text);
}

/** documentId: / id: with document context, or UUID when message mentions documents. */
export function hasDocumentIdInMessage(text: string): boolean {
  const kv = parseKeyValuePairs(text);
  if (kv.documentid) return true;
  const t = text.toLowerCase();
  if (!/\bdocument(s)?\b/.test(t) && !/\bknowledge\b/.test(t)) return false;
  if (kv.id) return true;
  return UUID_IN_TEXT.test(text);
}

/** voiceId: / id: with voice context, or UUID when message mentions voices. */
export function hasVoiceIdInMessage(text: string): boolean {
  const kv = parseKeyValuePairs(text);
  if (kv.voiceid) return true;
  const t = text.toLowerCase();
  if (!/\bvoice(s)?\b/.test(t)) return false;
  if (kv.id) return true;
  return UUID_IN_TEXT.test(text);
}

const RESOURCE_LIST_VERBS =
  /(list|show|get|fetch|see|display|what|tell me|give me|all my|do i have|i have|have i|which|catalog|how many|anything i.?ve created)/i;

/** List / catalog of Runway avatars (not realtime session, not CRUD). */
export function avatarListIntent(text: string): boolean {
  const t = text.toLowerCase();
  if (!/\bavatar(s)?\b/.test(t) && !/\bcharacter(s)?\b/.test(t)) return false;
  if (hasAvatarIdInMessage(text)) return false;
  if (/\b(create|update|delete|remove|link|attach)\b/.test(t)) return false;
  if (/\b(session|webrtc|realtime|live)\b/.test(t)) return false;
  if (/\b(detail|details|schema|metadata|graph)\b/.test(t)) return false;
  return RESOURCE_LIST_VERBS.test(t);
}

/** One avatar's metadata / details. */
export function avatarDetailIntent(text: string): boolean {
  const t = text.toLowerCase();
  if (!/\bavatar(s)?\b/.test(t) && !/\bcharacter(s)?\b/.test(t)) return false;
  if (
    /(detail|details|schema|metadata|definition|describe|what is|look up|lookup|info about|breakdown)/i.test(t)
  ) {
    return true;
  }
  return hasAvatarIdInMessage(text) && /(get|show|fetch|pull|open)\b/i.test(t);
}

/** List knowledge documents. */
export function documentListIntent(text: string): boolean {
  const t = text.toLowerCase();
  if (!/\bdocument(s)?\b/.test(t) && !/\bknowledge\b/.test(t)) return false;
  if (hasDocumentIdInMessage(text)) return false;
  if (/\b(create|update|delete|remove)\b/.test(t)) return false;
  if (/\b(detail|details|schema|metadata|graph)\b/.test(t)) return false;
  return RESOURCE_LIST_VERBS.test(t);
}

export function documentDetailIntent(text: string): boolean {
  const t = text.toLowerCase();
  if (!/\bdocument(s)?\b/.test(t) && !/\bknowledge\b/.test(t)) return false;
  if (
    /(detail|details|schema|metadata|definition|describe|what is|look up|lookup|info about|breakdown)/i.test(t)
  ) {
    return true;
  }
  return hasDocumentIdInMessage(text) && /(get|show|fetch|pull|open)\b/i.test(t);
}

/** List custom voices. */
export function voiceListIntent(text: string): boolean {
  const t = text.toLowerCase();
  if (!/\bvoice(s)?\b/.test(t)) return false;
  if (hasVoiceIdInMessage(text)) return false;
  if (/\b(create|update|delete|remove)\b/.test(t)) return false;
  if (/\b(detail|details|schema|metadata|graph)\b/.test(t)) return false;
  return RESOURCE_LIST_VERBS.test(t);
}

export function voiceDetailIntent(text: string): boolean {
  const t = text.toLowerCase();
  if (!/\bvoice(s)?\b/.test(t)) return false;
  if (
    /(detail|details|schema|metadata|definition|describe|what is|look up|lookup|info about|breakdown)/i.test(t)
  ) {
    return true;
  }
  return hasVoiceIdInMessage(text) && /(get|show|fetch|pull|open)\b/i.test(t);
}

/** Org / credits / limits (pair with runwayContext). */
export function orgInfoIntent(text: string): boolean {
  const t = text.toLowerCase();
  return /(credit|balance|credits|tier|limit|limits|quota|organization|organisation|org|account|subscription|plan|billing)/i.test(
    t,
  );
}

/** Usage history patterns (pair with runwayContext). */
export function usageHistoryIntent(text: string): boolean {
  const t = text.toLowerCase();
  return /(usage|consumption|spent|history|report|by day|per day)/i.test(t);
}

/**
 * Runway context from the user turn or composed state (prior summary), so short follow-ups can still match.
 */
export function runwayContext(message: Memory | undefined, state?: State): boolean {
  const messageText = (message?.content?.text ?? '').trim();
  const stateText = typeof state?.text === 'string' ? state.text : '';
  return mentionsRunway(`${messageText}\n${stateText}`);
}

export function normalizeText(message: { content?: { text?: string } } | undefined): string {
  return (message?.content?.text ?? '').trim();
}

export function matchesAny(haystack: string, needles: string[]): boolean {
  const h = haystack.toLowerCase();
  return needles.some((n) => h.includes(n.toLowerCase()));
}

/** Returns substring after the first matched keyword, trimmed; falls back to full text. */
export function extractPromptAfterKeyword(text: string, keywords: string[]): string {
  const lower = text.toLowerCase();
  for (const kw of keywords) {
    const i = lower.indexOf(kw.toLowerCase());
    if (i >= 0) {
      const rest = text.slice(i + kw.length).trim();
      if (rest.length > 0) return rest.replace(/^[:,]\s*/, '');
    }
  }
  return text.trim();
}

/** Pull `key:value` or `key="value"` pairs from free text (best-effort). */
export function parseKeyValuePairs(text: string): Record<string, string> {
  const out: Record<string, string> = {};
  const re = /(\w+)\s*[:=]\s*("([^"]+)"|'([^']+)'|(\S+))/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(text)) !== null) {
    const key = m[1].toLowerCase();
    const val = (m[3] ?? m[4] ?? m[5] ?? '').trim();
    if (key && val) out[key] = val;
  }
  return out;
}
