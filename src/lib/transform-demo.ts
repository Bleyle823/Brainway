import type { ProfileId } from "@/components/transform/ProfileSelector";
import type { AllConfig } from "@/components/transform/TransformConfig";

/**
 * Official Runway devportal sample for gen4_aleph (short taxi clip).
 * Same asset as the video-to-video playground examples.
 */
export const DEMO_SAMPLE_VIDEO_URL =
  "https://runway-static-assets.s3.us-east-1.amazonaws.com/devportal/playground-examples/v2v-gen4_aleph-input.mp4";

/** Reproducible runs for demos — mirrors typical playground fixed-seed behaviour. */
export const DEMO_TRANSFORM_SEED = 49_543_776;

/** Profiles that showcase sensory calming, predictable structure, and focus support. */
export const DEMO_PROFILE_IDS: ProfileId[] = ["sensory", "autism", "adhd"];

/** Slider/toggle values aligned with TransformConfig defaults used by buildTransformPrompt. */
export const DEMO_PRESET_CONFIG: AllConfig = {
  adhd: { focusMode: true },
  autism: { backgroundMotion: "Static" },
  sensory: { saturation: 35, transition: "Dissolve only" },
  dyslexia: {},
} as AllConfig;
