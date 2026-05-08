import { createServerFn } from "@tanstack/react-start";
import type { SessionCredentials } from "@runwayml/avatars-react";
import type { ProfileId } from "@/components/transform/ProfileSelector";
import type { AllConfig } from "@/components/transform/TransformConfig";
import {
  buildCharacterPersonality,
  buildCharacterStartScript,
} from "@/lib/character-personality";
import {
  consumeRealtimeSession,
  createRealtimeSession,
  getRealtimeSession,
  sleep,
  type RealtimeAvatarRef,
} from "@/lib/runway-characters";

function getApiKey(): string {
  const key = process.env.RUNWAYML_API_SECRET;
  if (!key) {
    throw new Error(
      "RUNWAYML_API_SECRET is not configured. Set it before starting a Characters session.",
    );
  }
  return key;
}

function resolveAvatarRef(
  overrides?: { avatarId?: string; avatarType?: "custom" | "preset" },
): RealtimeAvatarRef {
  const id =
    overrides?.avatarId ??
    process.env.RUNWAY_CHARACTER_AVATAR_ID ??
    "music-superstar";
  const type =
    overrides?.avatarType ??
    ((process.env.RUNWAY_CHARACTER_AVATAR_TYPE ?? "preset") === "custom"
      ? "custom"
      : "preset");
  return type === "custom"
    ? { type: "custom", avatarId: id }
    : { type: "preset", avatarId: id };
}

export interface CreateCharacterSessionInput {
  profiles: ProfileId[];
  config: AllConfig;
  /** Optional per-request avatar override */
  avatarId?: string;
  avatarType?: "custom" | "preset";
}

export const createCharacterSessionFn = createServerFn({ method: "POST" })
  .inputValidator((d: CreateCharacterSessionInput) => d)
  .handler(async ({ data }): Promise<SessionCredentials> => {
    const key = getApiKey();
    const personality = buildCharacterPersonality(data.profiles, data.config);
    const startScript = buildCharacterStartScript(data.profiles);
    const avatar = resolveAvatarRef({
      avatarId: data.avatarId,
      avatarType: data.avatarType,
    });

    const { id: sessionId } = await createRealtimeSession(key, {
      model: "gwm1_avatars",
      avatar,
      personality,
      startScript,
    });

    let sessionKey: string | undefined;

    for (let i = 0; i < 60; i++) {
      const session = await getRealtimeSession(key, sessionId);

      if (session.status === "READY" && session.sessionKey) {
        sessionKey = session.sessionKey;
        break;
      }
      if (session.status === "FAILED" || session.status === "CANCELLED") {
        throw new Error(
          session.failure ?? "Realtime session provisioning failed.",
        );
      }

      await sleep(1000);
    }

    if (!sessionKey) {
      throw new Error("Realtime session timed out waiting for READY state.");
    }

    const consumed = await consumeRealtimeSession(sessionKey, sessionId);

    return {
      sessionId,
      serverUrl: consumed.url,
      token: consumed.token,
      roomName: consumed.roomName,
    };
  });
