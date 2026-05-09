import { createServerFn } from "@tanstack/react-start";
import {
  createEphemeralUpload,
  startVideoToVideo,
  getTask,
  cancelTask,
  type UploadIntent,
  type RunwayTask,
} from "./runway-api";
import { buildTransformPrompt } from "./transform-prompts";
import type { ProfileId } from "@/components/transform/ProfileSelector";
import type { AllConfig } from "@/components/transform/TransformConfig";

function getApiKey(): string {
  // Works in Node.js dev server (set via shell env or a .env.local file).
  // For Cloudflare Workers production, add a secret via:
  //   wrangler secret put RUNWAYML_API_SECRET
  const key = process.env.RUNWAYML_API_SECRET;
  if (!key) {
    throw new Error(
      "RUNWAYML_API_SECRET is not configured. " +
        "Set it in your environment or .dev.vars file.",
    );
  }
  return key;
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
// Optional: cancel a running task (e.g. when the user navigates away)
// ---------------------------------------------------------------------------
export const cancelTaskFn = createServerFn({ method: "POST" })
  .inputValidator((d: { taskId: string }) => d)
  .handler(async ({ data }): Promise<void> => {
    const key = getApiKey();
    await cancelTask(key, data.taskId);
  });
