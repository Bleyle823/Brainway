import RunwayML from "@runwayml/sdk";
import type { VoiceDubbingCreateParams } from "@runwayml/sdk/resources/voice-dubbing.js";

import {
  getRunwayApiBase,
  getRunwayApiOrigin,
  RUNWAY_API_VERSION,
} from "@/lib/runway-config";

const VERSION = RUNWAY_API_VERSION;

function jsonHeaders(key: string): Record<string, string> {
  return {
    Authorization: `Bearer ${key}`,
    "Content-Type": "application/json",
    "X-Runway-Version": VERSION,
  };
}

function authHeaders(key: string): Record<string, string> {
  return {
    Authorization: `Bearer ${key}`,
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
// Ephemeral uploads
// ---------------------------------------------------------------------------

export interface UploadIntent {
  uploadUrl: string;
  fields: Record<string, string>;
  runwayUri: string;
}

export async function createEphemeralUpload(
  key: string,
  filename: string,
): Promise<UploadIntent> {
  const res = await fetch(`${getRunwayApiBase()}/uploads`, {
    method: "POST",
    headers: jsonHeaders(key),
    body: JSON.stringify({ filename, type: "ephemeral" }),
  });
  if (!res.ok) {
    const text = await res.text().catch(() => "");
    if (res.status === 403 && /credit/i.test(text)) {
      throw new Error(
        `Runway createEphemeralUpload: 403 ${text}\n\n` +
          "If you already have Developer API credits: this usually means the API key belongs to a " +
          "different organization than the one showing your balance — in https://dev.runwayml.com open the org " +
          "that has credits, API Keys tab, and create or copy a key from that org. Also restart the dev server after " +
          "editing .env. Check RUNWAYML_API_BASE_URL includes /v1 (or omit it; the app defaults correctly). " +
          "Until uploads work: use a file under ~12 MB, or a direct HTTPS video URL.",
      );
    }
    throw new Error(`Runway createEphemeralUpload: ${res.status} ${text}`);
  }
  return res.json() as Promise<UploadIntent>;
}

// ---------------------------------------------------------------------------
// Video-to-video (gen4_aleph)
// ---------------------------------------------------------------------------

export interface VideoToVideoParams {
  model: "gen4_aleph";
  promptVideo: string;
  promptText: string;
  promptImage?: string;
  ratio?: string;
  seed?: number;
}

export interface RunwayTask {
  id: string;
  status: "PENDING" | "RUNNING" | "SUCCEEDED" | "FAILED" | "CANCELLED";
  /** 0–1 float, only present while RUNNING */
  progress?: number;
  /** Array of output URLs when SUCCEEDED */
  output?: string[];
  failure?: string;
  failureCode?: string;
  createdAt: string;
  updatedAt: string;
}

function isHttpsVideoUri(ref: string): boolean {
  return /^https?:\/\//i.test(ref.trim());
}

/**
 * Starts gen4_aleph video-to-video. For public `https://` inputs, uses the official
 * `@runwayml/sdk` (`videoUri` + optional `seed`). For `runway://` ephemeral URIs and
 * `data:` video URIs, uses the REST `video_to_video` endpoint with `promptVideo`.
 */
export async function startVideoToVideo(
  key: string,
  params: VideoToVideoParams,
): Promise<{ id: string }> {
  const source = params.promptVideo.trim();

  if (isHttpsVideoUri(source)) {
    const client = new RunwayML({
      apiKey: key,
      baseURL: getRunwayApiOrigin(),
      runwayVersion: RUNWAY_API_VERSION,
    });

    const created = await client.videoToVideo.create({
      model: "gen4_aleph",
      videoUri: source,
      promptText: params.promptText,
      ...(params.ratio
        ? { ratio: params.ratio as NonNullable<Parameters<RunwayML["videoToVideo"]["create"]>[0]["ratio"]> }
        : {}),
      ...(params.seed != null ? { seed: params.seed } : {}),
    });

    return { id: created.id };
  }

  const body: Record<string, unknown> = {
    model: params.model,
    promptVideo: source,
    promptText: params.promptText,
  };
  if (params.promptImage) body.promptImage = params.promptImage;
  if (params.ratio) body.ratio = params.ratio;
  if (params.seed != null) body.seed = params.seed;

  const res = await fetch(`${getRunwayApiBase()}/video_to_video`, {
    method: "POST",
    headers: jsonHeaders(key),
    body: JSON.stringify(body),
  });
  await assertOk(res, "startVideoToVideo");
  return res.json() as Promise<{ id: string }>;
}

// ---------------------------------------------------------------------------
// Text-to-image (gen4_image)
// ---------------------------------------------------------------------------

/** Allowed aspect ratios for gen4_image (text-to-image). */
export type Gen4ImageRatio =
  | "1280:720"
  | "720:1280"
  | "1024:1024"
  | "1080:1080"
  | "1168:880"
  | "1360:768"
  | "1440:1080"
  | "1080:1440"
  | "1808:768"
  | "1920:1080"
  | "1080:1920"
  | "2112:912"
  | "720:720"
  | "960:720"
  | "720:960"
  | "1680:720";

export interface TextToImageParams {
  model: "gen4_image";
  promptText: string;
  ratio: Gen4ImageRatio;
  referenceImages?: Array<{ uri: string; tag?: string }>;
  seed?: number;
}

/**
 * Starts gen4_image text-to-image using the official @runwayml/sdk.
 * Accepts HTTPS URLs or data: URIs for reference images.
 */
export async function startGen4Image(
  key: string,
  params: TextToImageParams,
): Promise<{ id: string }> {
  const client = new RunwayML({
    apiKey: key,
    baseURL: getRunwayApiOrigin(),
    runwayVersion: RUNWAY_API_VERSION,
  });

  const created = await client.textToImage.create({
    model: "gen4_image",
    promptText: params.promptText,
    ratio: params.ratio as Parameters<RunwayML["textToImage"]["create"]>[0]["ratio"],
    ...(params.referenceImages && params.referenceImages.length > 0
      ? { referenceImages: params.referenceImages }
      : {}),
    ...(params.seed != null ? { seed: params.seed } : {}),
  });

  return { id: created.id };
}

// ---------------------------------------------------------------------------
// Image-to-video (gen4.5)
// ---------------------------------------------------------------------------

/** Ratios supported by gen4.5 image-to-video. */
export type Gen45ImageRatio =
  | "1280:720"
  | "720:1280"
  | "1104:832"
  | "960:960"
  | "832:1104"
  | "1584:672";

/** Ratios supported by gen4.5 text-to-video (subset of image-to-video ratios). */
export type Gen45TextRatio = "1280:720" | "720:1280";

export interface ImageToVideoParams {
  model: "gen4.5";
  promptText: string;
  /** Required for image-to-video mode; omit for text-to-video. */
  promptImage?: string;
  ratio: Gen45ImageRatio;
  /** 2-10 seconds */
  duration: number;
  seed?: number;
}

/**
 * Starts gen4.5 image-to-video or text-to-video using the official @runwayml/sdk.
 *
 * - When `promptImage` is provided, calls `client.imageToVideo.create` (Gen4.5 i2v).
 * - When `promptImage` is omitted, calls `client.textToVideo.create` (Gen4.5 t2v).
 *   gen4.5 text-to-video only supports landscape (1280:720) or portrait (720:1280);
 *   any other ratio is auto-snapped to landscape so the call doesn't 422.
 */
export async function startEducatorGen45Video(
  key: string,
  params: ImageToVideoParams,
): Promise<{ id: string }> {
  const client = new RunwayML({
    apiKey: key,
    baseURL: getRunwayApiOrigin(),
    runwayVersion: RUNWAY_API_VERSION,
  });

  if (params.promptImage) {
    const created = await client.imageToVideo.create({
      model: "gen4.5",
      promptImage: params.promptImage,
      promptText: params.promptText,
      ratio: params.ratio,
      duration: params.duration,
      ...(params.seed != null ? { seed: params.seed } : {}),
    });
    return { id: created.id };
  }

  const t2vRatio: Gen45TextRatio =
    params.ratio === "1280:720" || params.ratio === "720:1280"
      ? params.ratio
      : "1280:720";

  const created = await client.textToVideo.create({
    model: "gen4.5",
    promptText: params.promptText,
    ratio: t2vRatio,
    duration: params.duration,
    ...(params.seed != null ? { seed: params.seed } : {}),
  });
  return { id: created.id };
}

// ---------------------------------------------------------------------------
// Character Performance (act_two)
// ---------------------------------------------------------------------------

/** Ratios supported by act_two character performance. */
export type Act2Ratio = "1280:720" | "720:1280" | "960:960" | "1104:832" | "832:1104";

export interface CharacterPerformanceParams {
  model: "act_two";
  character: { type: "image" | "video"; uri: string };
  reference: { type: "video"; uri: string };
  ratio: Act2Ratio;
  bodyControl?: boolean;
  expressionIntensity?: 1 | 2 | 3 | 4 | 5;
  seed?: number;
}

/**
 * Starts act_two character performance using the official @runwayml/sdk.
 */
export async function startCharacterPerformance(
  key: string,
  params: CharacterPerformanceParams,
): Promise<{ id: string }> {
  const client = new RunwayML({
    apiKey: key,
    baseURL: getRunwayApiOrigin(),
    runwayVersion: RUNWAY_API_VERSION,
  });

  const created = await client.characterPerformance.create({
    model: "act_two",
    character: params.character,
    reference: params.reference,
    ratio: params.ratio,
    ...(params.bodyControl != null ? { bodyControl: params.bodyControl } : {}),
    ...(params.expressionIntensity != null ? { expressionIntensity: params.expressionIntensity } : {}),
    ...(params.seed != null ? { seed: params.seed } : {}),
  });

  return { id: created.id };
}

// ---------------------------------------------------------------------------
// Sound Effects (eleven_text_to_sound_v2)
// ---------------------------------------------------------------------------

export interface SoundEffectParams {
  model: "eleven_text_to_sound_v2";
  promptText: string;
  duration: number;
  loop?: boolean;
}

/**
 * Starts sound effect generation using the official @runwayml/sdk.
 */
export async function startSoundEffect(
  key: string,
  params: SoundEffectParams,
): Promise<{ id: string }> {
  const client = new RunwayML({
    apiKey: key,
    baseURL: getRunwayApiOrigin(),
    runwayVersion: RUNWAY_API_VERSION,
  });

  const created = await client.soundEffect.create({
    model: "eleven_text_to_sound_v2",
    promptText: params.promptText,
    duration: params.duration,
    ...(params.loop != null ? { loop: params.loop } : {}),
  });

  return { id: created.id };
}

// ---------------------------------------------------------------------------
// Speech-to-Speech (eleven_multilingual_sts_v2)
// ---------------------------------------------------------------------------

export interface SpeechToSpeechParams {
  model: "eleven_multilingual_sts_v2";
  media: { type: "audio" | "video"; uri: string };
  voice: { type: "runway-preset"; presetId: string };
}

/**
 * Starts speech-to-speech conversion using the official @runwayml/sdk.
 */
export async function startSpeechToSpeech(
  key: string,
  params: SpeechToSpeechParams,
): Promise<{ id: string }> {
  const client = new RunwayML({
    apiKey: key,
    baseURL: getRunwayApiOrigin(),
    runwayVersion: RUNWAY_API_VERSION,
  });

  const created = await client.speechToSpeech.create({
    model: "eleven_multilingual_sts_v2",
    media: params.media,
    voice: params.voice,
  });

  return { id: created.id };
}

// ---------------------------------------------------------------------------
// Voice Dubbing (eleven_voice_dubbing)
// ---------------------------------------------------------------------------

export interface VoiceDubbingParams {
  model: "eleven_voice_dubbing";
  audioUri: string;
  targetLang: string;
  /** Generic dub voice vs cloned timbre — driven by learner profiles server-side when unset here. */
  disableVoiceCloning?: boolean;
  /** Strip beds / ambience from dubbed output — useful for sensory-safe caps. */
  dropBackgroundAudio?: boolean;
  numSpeakers?: number;
}

/**
 * Starts voice dubbing using the official @runwayml/sdk.
 */
export async function startVoiceDubbing(
  key: string,
  params: VoiceDubbingParams,
): Promise<{ id: string }> {
  const client = new RunwayML({
    apiKey: key,
    baseURL: getRunwayApiOrigin(),
    runwayVersion: RUNWAY_API_VERSION,
  });

  const created = await client.voiceDubbing.create({
    model: "eleven_voice_dubbing",
    audioUri: params.audioUri,
    targetLang: params.targetLang as VoiceDubbingCreateParams["targetLang"],
    disableVoiceCloning: params.disableVoiceCloning,
    dropBackgroundAudio: params.dropBackgroundAudio,
    numSpeakers: params.numSpeakers,
  });

  return { id: created.id };
}

// ---------------------------------------------------------------------------
// Task polling
// ---------------------------------------------------------------------------

export async function getTask(key: string, taskId: string): Promise<RunwayTask> {
  const res = await fetch(`${getRunwayApiBase()}/tasks/${taskId}`, {
    headers: authHeaders(key),
  });
  await assertOk(res, "getTask");
  return res.json() as Promise<RunwayTask>;
}

export async function cancelTask(key: string, taskId: string): Promise<void> {
  await fetch(`${getRunwayApiBase()}/tasks/${taskId}/cancel`, {
    method: "POST",
    headers: authHeaders(key),
  });
}
