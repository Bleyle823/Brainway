import { getRunwayApiBase, RUNWAY_API_VERSION } from '../config/runwayConfig.ts';
import { assertOk } from './runwayHttp.ts';

function jsonHeaders(key: string): Record<string, string> {
  return {
    Authorization: `Bearer ${key}`,
    'Content-Type': 'application/json',
    'X-Runway-Version': RUNWAY_API_VERSION,
  };
}

function sessionKeyHeaders(sessionKey: string): Record<string, string> {
  return {
    Authorization: `Bearer ${sessionKey}`,
    'Content-Type': 'application/json',
    'X-Runway-Version': RUNWAY_API_VERSION,
  };
}

export type RealtimeAvatarRef =
  | { type: 'custom'; avatarId: string }
  | { type: 'runway-preset'; presetId: string };

export interface CreateRealtimeSessionParams {
  model: 'gwm1_avatars';
  avatar: RealtimeAvatarRef;
  personality?: string;
  startScript?: string;
}

export interface CreateRealtimeSessionResult {
  id: string;
}

export async function createRealtimeSession(
  apiKey: string,
  params: CreateRealtimeSessionParams,
): Promise<CreateRealtimeSessionResult> {
  const res = await fetch(`${getRunwayApiBase()}/realtime_sessions`, {
    method: 'POST',
    headers: jsonHeaders(apiKey),
    body: JSON.stringify(params),
  });
  await assertOk(res, 'createRealtimeSession');
  return res.json() as Promise<CreateRealtimeSessionResult>;
}

export type RealtimeSessionStatus =
  | 'NOT_READY'
  | 'READY'
  | 'RUNNING'
  | 'COMPLETED'
  | 'FAILED'
  | 'CANCELLED';

export interface RealtimeSession {
  id: string;
  status: RealtimeSessionStatus;
  sessionKey?: string;
  failure?: string;
}

export async function getRealtimeSession(apiKey: string, sessionId: string): Promise<RealtimeSession> {
  const res = await fetch(`${getRunwayApiBase()}/realtime_sessions/${sessionId}`, {
    headers: jsonHeaders(apiKey),
  });
  await assertOk(res, 'getRealtimeSession');
  return res.json() as Promise<RealtimeSession>;
}

export interface ConsumeSessionCredentials {
  url: string;
  token: string;
  roomName: string;
}

export async function consumeRealtimeSession(
  sessionKey: string,
  sessionId: string,
): Promise<ConsumeSessionCredentials> {
  const res = await fetch(`${getRunwayApiBase()}/realtime_sessions/${sessionId}/consume`, {
    method: 'POST',
    headers: sessionKeyHeaders(sessionKey),
  });
  await assertOk(res, 'consumeRealtimeSession');
  return res.json() as Promise<ConsumeSessionCredentials>;
}

export function sleep(ms: number): Promise<void> {
  return new Promise((r) => setTimeout(r, ms));
}
