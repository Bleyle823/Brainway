import { createServerFn } from "@tanstack/react-start";
import {
  startEducatorGen45Video,
  type ImageToVideoParams,
  type RunwayTask,
} from "./runway-api";
import { buildEducatorGenPrompt } from "./educator-generate-prompts";
import type { ProfileId } from "@/components/transform/ProfileSelector";
import { getRunwayApiSecret } from "./runway-config";

// Re-export the polling functions from transform-fns since they work with the same task type
export { pollTaskFn, cancelTaskFn } from "./transform-fns";

function getApiKey(): string {
  return getRunwayApiSecret();
}

// ---------------------------------------------------------------------------
// Educator video generation
// ---------------------------------------------------------------------------

export interface StartEducatorGenerateInput {
  /** Generation mode: text-to-video or image-to-video */
  mode: "text" | "image";
  /** User's text prompt describing what they want in the video */
  prompt: string;
  /** Optional image source - data URI, HTTPS URL, or runway:// URI */
  imageSource?: string;
  /** Video aspect ratio */
  ratio: "1280:720" | "720:1280" | "1104:832" | "960:960" | "832:1104" | "1584:672";
  /** Duration in seconds (2-10) */
  duration: number;
  /** Optional accessibility profiles to apply to prompt */
  profiles?: ProfileId[];
  /** Optional seed for reproducible generation */
  seed?: number;
}

export const startEducatorGenerateFn = createServerFn({ method: "POST" })
  .inputValidator((d: StartEducatorGenerateInput) => d)
  .handler(async ({ data }): Promise<{ taskId: string }> => {
    const key = getApiKey();
    
    // Build the learner-safe prompt
    const enhancedPrompt = buildEducatorGenPrompt(data.prompt, data.profiles);
    
    // Validate inputs
    if (data.duration < 2 || data.duration > 10) {
      throw new Error("Duration must be between 2 and 10 seconds");
    }
    
    if (data.mode === "image" && !data.imageSource) {
      throw new Error("Image source is required for image-to-video mode");
    }

    // Prepare parameters for Runway API
    const params: ImageToVideoParams = {
      model: "gen4.5",
      promptText: enhancedPrompt,
      ratio: data.ratio,
      duration: data.duration,
      ...(data.seed != null ? { seed: data.seed } : {}),
    };

    // Add image for image-to-video mode
    if (data.mode === "image" && data.imageSource) {
      params.promptImage = data.imageSource;
    }

    try {
      const task = await startEducatorGen45Video(key, params);
      return { taskId: task.id };
    } catch (error) {
      // Handle TaskFailedError and other Runway API errors
      if (error instanceof Error) {
        throw new Error(`Video generation failed: ${error.message}`);
      }
      throw new Error("Video generation failed with an unknown error");
    }
  });

// ---------------------------------------------------------------------------
// Helper function to validate generation parameters
// ---------------------------------------------------------------------------

export interface ValidateGenerationInput {
  mode: "text" | "image";
  prompt: string;
  profiles?: ProfileId[];
}

export const validateGenerationInputFn = createServerFn({ method: "POST" })
  .inputValidator((d: ValidateGenerationInput) => d)
  .handler(async ({ data }): Promise<{ 
    isValid: boolean; 
    enhancedPrompt: string;
    promptLength: number;
    errors: string[];
  }> => {
    const errors: string[] = [];
    
    if (!data.prompt.trim()) {
      errors.push("Prompt cannot be empty");
    }
    
    const enhancedPrompt = buildEducatorGenPrompt(data.prompt, data.profiles);
    
    if (enhancedPrompt.length > 1000) {
      errors.push("Enhanced prompt exceeds 1000 character limit");
    }
    
    return {
      isValid: errors.length === 0,
      enhancedPrompt,
      promptLength: enhancedPrompt.length,
      errors,
    };
  });