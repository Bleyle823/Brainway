import { createServerFn } from "@tanstack/react-start";
import {
  createEphemeralUpload,
  startVideoToVideo,
  startGen4Image,
  startCharacterPerformance,
  startSoundEffect,
  startSpeechToSpeech,
  startVoiceDubbing,
  getTask,
  cancelTask,
  type UploadIntent,
  type RunwayTask,
  type Gen4ImageRatio,
  type Act2Ratio,
} from "./runway-api";
import { buildTransformPrompt } from "./transform-prompts";
import {
  buildEducatorSafeImagePrompt,
  type ImagePromptKind,
} from "./educator-image-prompt";
import {
  pickSafeVoicePreset,
  buildSafeSoundEffectPrompt,
  type SoundscapeId,
} from "./safe-audio-prompts";
import type { ProfileId } from "@/components/transform/ProfileSelector";
import type { AllConfig } from "@/components/transform/TransformConfig";
import { getRunwayApiSecret } from "./runway-config";
import { getLanguage } from "./languages";

function getApiKey(): string {
  return getRunwayApiSecret();
}

// ---------------------------------------------------------------------------
// Step 1: create an ephemeral upload intent
//   Returns the S3 pre-signed POST URL + fields + the runway:// URI that you
//   pass to startTransformFn once the browser has uploaded the file.
// ---------------------------------------------------------------------------
export const createUploadIntentFn = createServerFn({ method: "POST" })
  .inputValidator((d: { filename: string }) => d)
  .handler(async ({ data }): Promise<UploadIntent> => {
    const key = getApiKey();
    return createEphemeralUpload(key, data.filename);
  });

// ---------------------------------------------------------------------------
// Step 2: start the gen4_aleph video-to-video transform job
// ---------------------------------------------------------------------------
export interface StartTransformInput {
  /** runway:// URI (from ephemeral upload) or a public HTTPS video URL */
  videoSource: string;
  profiles: ProfileId[];
  config: AllConfig;
  /** BCP-47 language code for the output video (default: "en") */
  targetLanguage?: string;
  /** Optional Aleph seed (HTTPS inputs use @runwayml/sdk; other URIs use REST). */
  seed?: number;
}

export const startTransformFn = createServerFn({ method: "POST" })
  .inputValidator((d: StartTransformInput) => d)
  .handler(async ({ data }): Promise<{ taskId: string }> => {
    const key = getApiKey();
    const prompt = buildTransformPrompt(data.profiles, data.config, data.targetLanguage ?? "en");

    const task = await startVideoToVideo(key, {
      model: "gen4_aleph",
      promptVideo: data.videoSource,
      promptText: prompt,
      ratio: "1280:720",
      ...(data.seed != null ? { seed: data.seed } : {}),
    });

    return { taskId: task.id };
  });

// ---------------------------------------------------------------------------
// Step 3: poll an in-progress task
// ---------------------------------------------------------------------------
export const pollTaskFn = createServerFn({ method: "POST" })
  .inputValidator((d: { taskId: string }) => d)
  .handler(async ({ data }): Promise<RunwayTask> => {
    const key = getApiKey();
    return getTask(key, data.taskId);
  });

// ---------------------------------------------------------------------------
// Educator image generation (gen4_image)
// ---------------------------------------------------------------------------
export interface StartEducatorImageInput {
  profiles: ProfileId[];
  config: AllConfig;
  /** BCP-47 language code for the output image (default: "en") */
  targetLanguage?: string;
  /** User's custom prompt text (can include @mentions for reference images) */
  userPromptSegment: string;
  /** "new" from description only; "adaptReference" requires referenceImages */
  promptKind?: ImagePromptKind;
  /** gen4_image aspect ratio (default 1920:1080) */
  ratio?: Gen4ImageRatio;
  /** Reference images (up to 3) with optional tags for @mentions */
  referenceImages?: Array<{ uri: string; tag?: string }>;
  /** Optional seed for reproducible generation */
  seed?: number;
}

export const startEducatorImageFn = createServerFn({ method: "POST" })
  .inputValidator((d: StartEducatorImageInput) => d)
  .handler(async ({ data }): Promise<{ taskId: string }> => {
    const key = getApiKey();
    
    // Validate reference images length
    if (data.referenceImages && data.referenceImages.length > 3) {
      throw new Error("Maximum 3 reference images allowed");
    }

    const kind: ImagePromptKind = data.promptKind ?? "new";
    if (kind === "adaptReference") {
      if (!data.referenceImages?.length) {
        throw new Error("Adapt-from-image mode requires a reference image (upload or URL).");
      }
    }
    if (kind === "imageToImage") {
      if (!data.referenceImages?.length) {
        throw new Error("Image-to-image requires a primary image (@primary).");
      }
      const hasPrimary = data.referenceImages.some((r) => r.tag === "primary");
      if (!hasPrimary) {
        throw new Error("Image-to-image requires the primary image to be tagged @primary.");
      }
    }

    const hasSecondReference =
      kind === "imageToImage" &&
      (data.referenceImages?.filter((r) => r.tag === "secondary").length ?? 0) > 0;

    const prompt = buildEducatorSafeImagePrompt(
      data.profiles,
      data.config,
      data.targetLanguage ?? "en",
      data.userPromptSegment,
      kind,
      hasSecondReference,
    );

    const ratio: Gen4ImageRatio = data.ratio ?? "1920:1080";

    const task = await startGen4Image(key, {
      model: "gen4_image",
      promptText: prompt,
      ratio,
      referenceImages: data.referenceImages,
      ...(data.seed != null ? { seed: data.seed } : {}),
    });

    return { taskId: task.id };
  });

// ---------------------------------------------------------------------------
// Optional: cancel a running task (e.g. when the user navigates away)
// ---------------------------------------------------------------------------
export const cancelTaskFn = createServerFn({ method: "POST" })
  .inputValidator((d: { taskId: string }) => d)
  .handler(async ({ data }): Promise<void> => {
    const key = getApiKey();
    await cancelTask(key, data.taskId);
  });

// ---------------------------------------------------------------------------
// Calm Presenter (act_two)
// ---------------------------------------------------------------------------
export interface StartCalmPresenterInput {
  characterUri: string;
  characterType: "image" | "video";
  referenceVideoUri: string;
  ratio: Act2Ratio;
  profiles: ProfileId[];
  config: AllConfig;
  targetLanguage?: string;
  seed?: number;
}

export const startCalmPresenterFn = createServerFn({ method: "POST" })
  .inputValidator((d: StartCalmPresenterInput) => d)
  .handler(async ({ data }): Promise<{ taskId: string }> => {
    const key = getApiKey();

    // Validate URIs (must be HTTPS or runway://)
    if (!data.characterUri.match(/^(https?:\/\/|runway:\/\/)/)) {
      throw new Error("Character URI must be a valid HTTPS URL or runway:// URI");
    }
    if (!data.referenceVideoUri.match(/^(https?:\/\/|runway:\/\/)/)) {
      throw new Error("Reference video URI must be a valid HTTPS URL or runway:// URI");
    }

    // Default to calmer settings for sensory/autism profiles
    const isSensitive = data.profiles.includes("sensory") || data.profiles.includes("autism");
    const bodyControl = true; // Always use body control for calm presenter
    const expressionIntensity = isSensitive ? 2 : 3; // Calmer expression for sensitive profiles

    const task = await startCharacterPerformance(key, {
      model: "act_two",
      character: {
        type: data.characterType,
        uri: data.characterUri,
      },
      reference: {
        type: "video",
        uri: data.referenceVideoUri,
      },
      ratio: data.ratio,
      bodyControl,
      expressionIntensity: expressionIntensity as 1 | 2 | 3 | 4 | 5,
      ...(data.seed != null ? { seed: data.seed } : {}),
    });

    return { taskId: task.id };
  });

// ---------------------------------------------------------------------------
// Calm Re-narration (speech_to_speech)
// ---------------------------------------------------------------------------
export interface StartCalmReNarrateInput {
  mediaUri: string;
  mediaType: "audio" | "video";
  profiles: ProfileId[];
  config: AllConfig;
  voicePresetOverride?: string;
}

export const startCalmReNarrateFn = createServerFn({ method: "POST" })
  .inputValidator((d: StartCalmReNarrateInput) => d)
  .handler(async ({ data }): Promise<{ taskId: string }> => {
    const key = getApiKey();

    // Validate URI
    if (!data.mediaUri.match(/^(https?:\/\/|runway:\/\/|data:)/)) {
      throw new Error("Media URI must be a valid HTTPS URL, runway:// URI, or data URI");
    }

    // Pick voice preset based on profiles unless overridden
    const presetId = data.voicePresetOverride || pickSafeVoicePreset(data.profiles, data.config);

    const task = await startSpeechToSpeech(key, {
      model: "eleven_multilingual_sts_v2",
      media: {
        type: data.mediaType,
        uri: data.mediaUri,
      },
      voice: {
        type: "runway-preset",
        presetId,
      },
    });

    return { taskId: task.id };
  });

// ---------------------------------------------------------------------------
// Localized Lecture (voice_dubbing)
// ---------------------------------------------------------------------------
export interface StartLocalizedLectureInput {
  audioUri: string;
  targetLanguage: string;
  profiles: ProfileId[];
  config: AllConfig;
}

export const startLocalizedLectureFn = createServerFn({ method: "POST" })
  .inputValidator((d: StartLocalizedLectureInput) => d)
  .handler(async ({ data }): Promise<{ taskId: string }> => {
    const key = getApiKey();

    // Validate URI
    if (!data.audioUri.match(/^(https?:\/\/|runway:\/\/|data:)/)) {
      throw new Error("Audio URI must be a valid HTTPS URL, runway:// URI, or data URI");
    }

    // Validate language code exists
    const lang = getLanguage(data.targetLanguage);
    if (!lang) {
      throw new Error(`Unsupported target language: ${data.targetLanguage}`);
    }

    const task = await startVoiceDubbing(key, {
      model: "eleven_voice_dubbing",
      audioUri: data.audioUri,
      targetLang: data.targetLanguage,
    });

    return { taskId: task.id };
  });

// ---------------------------------------------------------------------------
// Sensory Soundscape (sound_effect)
// ---------------------------------------------------------------------------
export interface StartSensorySoundscapeInput {
  scene: SoundscapeId;
  durationSec: number;
  loop: boolean;
  customNotes?: string;
  profiles: ProfileId[];
  config: AllConfig;
}

export const startSensorySoundscapeFn = createServerFn({ method: "POST" })
  .inputValidator((d: StartSensorySoundscapeInput) => d)
  .handler(async ({ data }): Promise<{ taskId: string }> => {
    const key = getApiKey();

    // Clamp duration to safe range
    const duration = Math.max(1, Math.min(30, data.durationSec));

    // Build neurodivergent-safe prompt
    const promptText = buildSafeSoundEffectPrompt(
      data.scene,
      data.profiles,
      data.config,
      data.customNotes,
    );

    const task = await startSoundEffect(key, {
      model: "eleven_text_to_sound_v2",
      promptText,
      duration,
      loop: data.loop,
    });

    return { taskId: task.id };
  });
