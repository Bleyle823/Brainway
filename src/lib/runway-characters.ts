/**
 * Fetch-based Runway Characters / realtime_sessions client.
 * Cloudflare Workers–compatible — no Node-only SDK required.
 */

const BASE = "https://api.dev.runwayml.com/v1";
const VERSION = "2024-11-06";

function jsonHeaders(key: string): Record<string, string> {
  return {
    Authorization: `Bearer ${key}`,
    "Content-Type": "application/json",
    "X-Runway-Version": VERSION,
  };
}

function sessionKeyHeaders(sessionKey: string): Record<string, string> {
  return {
    Authorization: `Bearer ${sessionKey}`,
    "Content-Type": "application/json",
    "X-Runway-Version": VERSION,
  };
}

async function assertOk(res: Response, label: string): Promise<void> {
  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(`Runway ${label}: ${res.status} ${text}`);
  }
}

// ---------------------------------------------------------------------------

export type RealtimeAvatarRef =
  | { type: "custom"; avatarId: string }
  | { type: "runway-preset"; presetId: string };

export interface CreateRealtimeSessionParams {
  model: "gwm1_avatars";
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
  const res = await fetch(`${BASE}/realtime_sessions`, {
    method: "POST",
    headers: jsonHeaders(apiKey),
    body: JSON.stringify(params),
  });
  await assertOk(res, "createRealtimeSession");
  return res.json() as Promise<CreateRealtimeSessionResult>;
}

/** Session states from docs.dev.runwayml.com/characters/concepts/ */
export type RealtimeSessionStatus =
  | "NOT_READY"
  | "READY"
  | "RUNNING"
  | "COMPLETED"
  | "FAILED"
  | "CANCELLED";

export interface RealtimeSession {
  id: string;
  status: RealtimeSessionStatus;
  sessionKey?: string;
  failure?: string;
}

export async function getRealtimeSession(
  apiKey: string,
  sessionId: string,
): Promise<RealtimeSession> {
  const res = await fetch(`${BASE}/realtime_sessions/${sessionId}`, {
    headers: jsonHeaders(apiKey),
  });
  await assertOk(res, "getRealtimeSession");
  return res.json() as Promise<RealtimeSession>;
}

export interface ConsumeSessionCredentials {
  url: string;
  token: string;
  roomName: string;
}

/**
 * Exchange a READY-session key for LiveKit-compatible WebRTC credentials.
 * Uses the sessionKey (NOT the API secret) as Bearer token.
 */
export async function consumeRealtimeSession(
  sessionKey: string,
  sessionId: string,
): Promise<ConsumeSessionCredentials> {
  const res = await fetch(`${BASE}/realtime_sessions/${sessionId}/consume`, {
    method: "POST",
    headers: sessionKeyHeaders(sessionKey),
  });
  await assertOk(res, "consumeRealtimeSession");
  return res.json() as Promise<ConsumeSessionCredentials>;
}

export function sleep(ms: number): Promise<void> {
  return new Promise((r) => setTimeout(r, ms));
}
