import type { IAgentRuntime } from '@elizaos/core';
import { Service, logger } from '@elizaos/core';
import {
  consumeRealtimeSession,
  createRealtimeSession as postRealtimeSession,
  getRealtimeSession,
  sleep,
  type CreateRealtimeSessionParams,
  type ConsumeSessionCredentials,
} from '../lib/realtimeSessions.ts';
import { RunwayService } from './RunwayService.ts';

export interface RealtimeSessionReadyResult extends ConsumeSessionCredentials {
  sessionId: string;
}

const DEFAULT_AVATAR_PRESET = 'music-superstar';

export class CharacterService extends Service {
  static serviceType = 'runway-characters';
  capabilityDescription =
    'Runway Characters (gwm1_avatars): create realtime session, wait until READY, consume for WebRTC credentials.';

  constructor(protected runtime: IAgentRuntime) {
    super(runtime);
  }

  static async start(runtime: IAgentRuntime): Promise<CharacterService> {
    logger.info('[CharacterService] starting');
    return new CharacterService(runtime);
  }

  static async stop(_runtime: IAgentRuntime): Promise<void> {
    logger.info('[CharacterService] stopped');
  }

  async stop(): Promise<void> {
    /* no-op */
  }

  private getRunway(): RunwayService {
    const svc = this.runtime.getService(RunwayService.serviceType) as RunwayService | null;
    if (!svc) {
      throw new Error('RunwayService is not registered.');
    }
    return svc;
  }

  resolveDefaultAvatar(): CreateRealtimeSessionParams['avatar'] {
    const type =
      (process.env.RUNWAY_CHARACTER_AVATAR_TYPE?.trim() as 'runway-preset' | 'custom' | undefined) ||
      'runway-preset';
    if (type === 'custom') {
      const avatarId =
        process.env.RUNWAY_CHARACTER_AVATAR_ID?.trim() || process.env.RUNWAY_CHARACTER_CUSTOM_AVATAR_ID?.trim();
      if (!avatarId) {
        throw new Error('RUNWAY_CHARACTER_AVATAR_ID is required when RUNWAY_CHARACTER_AVATAR_TYPE=custom');
      }
      return { type: 'custom', avatarId };
    }
    const presetId = process.env.RUNWAY_CHARACTER_AVATAR_ID?.trim() || DEFAULT_AVATAR_PRESET;
    return { type: 'runway-preset', presetId };
  }

  async createRealtimeSession(params: Omit<CreateRealtimeSessionParams, 'model'>): Promise<{ id: string }> {
    const apiKey = this.getRunway().getApiSecret();
    return postRealtimeSession(apiKey, { model: 'gwm1_avatars', ...params });
  }

  async waitUntilSessionReady(
    sessionId: string,
    opts: { timeoutMs?: number; pollMs?: number } = {},
  ): Promise<{ sessionKey: string }> {
    const apiKey = this.getRunway().getApiSecret();
    const timeoutMs = opts.timeoutMs ?? 120_000;
    const pollMs = opts.pollMs ?? 1500;
    const deadline = Date.now() + timeoutMs;

    while (Date.now() < deadline) {
      const s = await getRealtimeSession(apiKey, sessionId);
      if (s.status === 'READY' && s.sessionKey) {
        return { sessionKey: s.sessionKey };
      }
      if (s.status === 'FAILED' || s.status === 'CANCELLED') {
        throw new Error(s.failure || `Realtime session ${sessionId} ended with status ${s.status}`);
      }
      await sleep(pollMs);
    }
    throw new Error(`Timed out waiting for realtime session ${sessionId} to become READY`);
  }

  async consumeSession(sessionId: string, sessionKey: string): Promise<ConsumeSessionCredentials> {
    return consumeRealtimeSession(sessionKey, sessionId);
  }

  /** Create → poll READY → consume; returns LiveKit-style credentials for `@runwayml/avatars-react`. */
  async createReadyConsumedSession(
    params: Omit<CreateRealtimeSessionParams, 'model' | 'avatar'> & {
      avatar?: CreateRealtimeSessionParams['avatar'];
    },
  ): Promise<RealtimeSessionReadyResult> {
    const avatar = params.avatar ?? this.resolveDefaultAvatar();
    const isCustom = avatar.type === 'custom';
    const { id } = await this.createRealtimeSession({
      avatar,
      ...(isCustom && params.personality ? { personality: params.personality } : {}),
      ...(isCustom && params.startScript ? { startScript: params.startScript } : {}),
    });
    const { sessionKey } = await this.waitUntilSessionReady(id);
    const creds = await this.consumeSession(id, sessionKey);
    return { sessionId: id, ...creds };
  }
}
