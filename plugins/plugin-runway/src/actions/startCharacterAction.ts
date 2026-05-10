import type { Action, ActionResult, HandlerCallback, IAgentRuntime, Memory, State } from '@elizaos/core';
import { logger } from '@elizaos/core';
import { extractPromptAfterKeyword, matchesAny, normalizeText, parseKeyValuePairs } from '../lib/actionHelpers.ts';
import type { CreateRealtimeSessionParams } from '../lib/realtimeSessions.ts';
import { CharacterService } from '../services/CharacterService.ts';
import { RunwayService } from '../services/RunwayService.ts';

const TRIGGERS = [
  'start character session',
  'runway character',
  'avatar session',
  'realtime character',
  'start runway live',
];

function parseAvatarFromText(text: string): CreateRealtimeSessionParams['avatar'] | undefined {
  const kv = parseKeyValuePairs(text);
  const type = (kv.avatartype || kv.avatar_type || '').toLowerCase();
  if (type === 'custom' && kv.avatarid) {
    return { type: 'custom', avatarId: kv.avatarid };
  }
  if (kv.presetid) {
    return { type: 'runway-preset', presetId: kv.presetid };
  }
  if (kv.avatarid && !type) {
    return { type: 'custom', avatarId: kv.avatarid };
  }
  return undefined;
}

export const startCharacterAction: Action = {
  name: 'RUNWAY_START_CHARACTER_SESSION',
  similes: ['RUNWAY_CHARACTERS', 'RUNWAY_LIVE_AVATAR'],
  description:
    'Creates a Runway Characters realtime session (gwm1_avatars), waits until READY, consumes, and returns WebRTC credentials. personality/startScript apply to custom avatars only. Optional: avatarType:custom avatarId:... or presetId:...',

  validate: async (_runtime: IAgentRuntime, message: Memory): Promise<boolean> => {
    const t = normalizeText(message);
    return !!t && matchesAny(t, TRIGGERS);
  },

  handler: async (
    runtime: IAgentRuntime,
    message: Memory,
    _state: State | undefined,
    _options: unknown,
    callback?: HandlerCallback,
  ): Promise<ActionResult> => {
    try {
      const runway = runtime.getService(RunwayService.serviceType) as RunwayService | null;
      const characters = runtime.getService(CharacterService.serviceType) as CharacterService | null;
      if (!runway || !characters) {
        const err = 'Runway / Character services are not available on this runtime.';
        if (callback) await callback({ text: err, error: true });
        return { success: false, text: err, error: new Error(err) };
      }

      runway.getApiSecret();

      const raw = normalizeText(message);
      const tail = extractPromptAfterKeyword(raw, TRIGGERS);
      const kv = parseKeyValuePairs(raw);

      const personality = kv.personality || kv.persona;
      const startScript = kv.startscript || kv.script;

      const avatar = parseAvatarFromText(raw);

      if (callback) {
        await callback({
          text: 'Creating Runway realtime session…',
          actions: ['RUNWAY_START_CHARACTER_SESSION'],
        });
      }

      const result = await characters.createReadyConsumedSession({
        avatar,
        ...(personality ? { personality } : {}),
        ...(startScript ? { startScript } : {}),
      });

      const summary =
        `Runway Characters session is ready.\n` +
        `- sessionId: ${result.sessionId}\n` +
        `- serverUrl: ${result.url}\n` +
        `- roomName: ${result.roomName}\n` +
        `- token: ${result.token.slice(0, 8)}… (truncated)\n` +
        `\nUse these with @runwayml/avatars-react AvatarSession (browser).`;

      if (callback) {
        await callback({ text: summary, actions: ['RUNWAY_START_CHARACTER_SESSION'] });
      }

      return {
        success: true,
        text: summary,
        data: {
          sessionId: result.sessionId,
          serverUrl: result.url,
          roomName: result.roomName,
          token: result.token,
          hint: tail || undefined,
        },
      };
    } catch (error) {
      logger.error({ error }, 'RUNWAY_START_CHARACTER_SESSION failed');
      const errMsg = error instanceof Error ? error.message : String(error);
      if (callback) await callback({ text: `Runway Characters error: ${errMsg}`, error: true });
      return { success: false, text: errMsg, error: error instanceof Error ? error : new Error(errMsg) };
    }
  },

  examples: [
    [
      { name: '{{user}}', content: { text: 'start character session personality: calm educator' } },
      { name: '{{agent}}', content: { text: 'Runway Characters session is ready…', actions: ['RUNWAY_START_CHARACTER_SESSION'] } },
    ],
  ],
};
