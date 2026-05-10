import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

import type { ProfileId } from "@/components/transform/ProfileSelector";
import type { AllConfig } from "@/components/transform/TransformConfig";
import { buildCharacterPersonality } from "@/lib/character-personality";
import { getRecallBridgeUrl, isRecallBridgeConfigured } from "@/lib/recall-bridge-config";
import { getRunwayApiOrigin, getRunwayApiSecret } from "@/lib/runway-config";

const recallStartInputSchema = z.object({
  meetingUrl: z.string().url(),
  meetingPassword: z.string().optional(),
  avatarType: z.enum(["preset", "custom"]),
  avatarId: z.string().min(1),
  botName: z.string().min(1).optional(),
  maxDuration: z.number().int().positive().max(3600).optional(),
  profiles: z.array(z.enum(["adhd", "autism", "dyslexia", "sensory"])),
  config: z.custom<AllConfig>(),
  targetLanguage: z.string().optional(),
});

export type RecallStartMeetingInput = z.infer<typeof recallStartInputSchema>;

export const recallBridgeStatusFn = createServerFn({ method: "GET" }).handler(async () => ({
  configured: isRecallBridgeConfigured(),
}));

export const recallStartMeetingFn = createServerFn({ method: "POST" })
  .inputValidator((data: RecallStartMeetingInput) => recallStartInputSchema.parse(data))
  .handler(async ({ data }) => {
    const bridge = getRecallBridgeUrl();
    const apiKey = getRunwayApiSecret();
    const baseUrl = getRunwayApiOrigin();

    const systemPrompt =
      data.profiles.length > 0
        ? buildCharacterPersonality(data.profiles as ProfileId[], data.config, data.targetLanguage ?? "en")
        : undefined;

    const res = await fetch(`${bridge}/api/start`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Runway-Key": apiKey,
        "X-Runway-Base-Url": baseUrl,
      },
      body: JSON.stringify({
        meetingUrl: data.meetingUrl,
        meetingPassword: data.meetingPassword?.trim() || undefined,
        avatarType: data.avatarType,
        avatarId: data.avatarId,
        botName: data.botName?.trim() || "Brainway Character",
        maxDuration: data.maxDuration ?? 300,
        systemPrompt,
      }),
    });

    const json = (await res.json().catch(() => ({}))) as {
      sessionId?: string;
      error?: string;
    };
    if (!res.ok) {
      throw new Error(json.error ?? `Recall bridge error (${res.status})`);
    }
    if (!json.sessionId) throw new Error("Recall bridge returned no sessionId");
    return { sessionId: json.sessionId };
  });

export interface RecallSessionPayload {
  status: string;
  error: string | null;
  logs: string[];
  runwaySessionId: string | null;
  recallBotId: string | null;
}

export const recallGetSessionFn = createServerFn({ method: "POST" })
  .inputValidator((d: { sessionId: string }) =>
    z.object({ sessionId: z.string().min(1) }).parse(d),
  )
  .handler(async ({ data }): Promise<RecallSessionPayload> => {
    const bridge = getRecallBridgeUrl();
    const res = await fetch(`${bridge}/api/sessions/${data.sessionId}`);
    const json = (await res.json().catch(() => ({}))) as RecallSessionPayload & { error?: string };
    if (!res.ok) {
      throw new Error(json.error ?? `Session fetch failed (${res.status})`);
    }
    return {
      status: json.status,
      error: json.error,
      logs: json.logs ?? [],
      runwaySessionId: json.runwaySessionId,
      recallBotId: json.recallBotId,
    };
  });

export const recallStopSessionFn = createServerFn({ method: "POST" })
  .inputValidator((d: { sessionId: string }) =>
    z.object({ sessionId: z.string().min(1) }).parse(d),
  )
  .handler(async ({ data }) => {
    const bridge = getRecallBridgeUrl();
    const res = await fetch(`${bridge}/api/sessions/${data.sessionId}/stop`, {
      method: "POST",
    });
    if (!res.ok) {
      const j = (await res.json().catch(() => ({}))) as { error?: string };
      throw new Error(j.error ?? `Stop failed (${res.status})`);
    }
    return { ok: true as const };
  });

export const recallMuteSessionFn = createServerFn({ method: "POST" })
  .inputValidator((d: { sessionId: string; muted: boolean }) =>
    z.object({ sessionId: z.string().min(1), muted: z.boolean() }).parse(d),
  )
  .handler(async ({ data }) => {
    const bridge = getRecallBridgeUrl();
    const res = await fetch(`${bridge}/api/sessions/${data.sessionId}/mute`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ muted: data.muted }),
    });
    if (!res.ok) {
      const j = (await res.json().catch(() => ({}))) as { error?: string };
      throw new Error(j.error ?? `Mute failed (${res.status})`);
    }
    return { muted: data.muted };
  });
