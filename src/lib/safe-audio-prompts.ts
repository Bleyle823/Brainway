import type { ProfileId } from "@/components/transform/ProfileSelector";
import type { AllConfig } from "@/components/transform/TransformConfig";

/**
 * act_two has no promptText field, so safety is enforced via:
 * (a) user choosing a calm character and (b) UI copy.
 * This constant exists for analytics/log lines only.
 */
export const ACT2_SAFETY_NOTE = 
  "Calm presenter mode uses act_two to retarget lecture performance onto a calm avatar, " +
  "reducing presenter-driven sensory load for neurodivergent learners.";

/**
 * Predefined soundscape scene types for sensory-safe background audio.
 */
export type SoundscapeId = 
  | "pinkNoiseRain" 
  | "ocean" 
  | "forest" 
  | "studyRoom" 
  | "whiteNoise" 
  | "custom";

/**
 * Picks a calm voice preset based on accessibility profiles and configuration.
 * Sensory profile → softest preset; ADHD-only → steady mid; fallback to softest.
 */
export function pickSafeVoicePreset(
  profiles: ProfileId[],
  config: AllConfig,
): string {
  // If sensory profile is active, use the softest voice
  if (profiles.includes("sensory")) {
    return "Maggie"; // Softest, most gentle preset
  }
  
  // ADHD-only benefits from steady, predictable mid-range voice
  if (profiles.includes("adhd") && !profiles.includes("autism")) {
    return "Noah"; // Steady, mid-range preset
  }
  
  // Default to softest for all other cases (autism, dyslexia, combinations)
  return "Maggie";
}

/**
 * Builds a neurodivergent-safe sound effect prompt that enforces:
 * - Low-mid frequency band (no harsh highs)
 * - No sudden onsets or transient spikes
 * - Predictable repetition patterns
 * - No speech, voices, or music
 * - Gentle stereo field
 * 
 * Modulates based on sensory saturation config and autism background motion preferences.
 */
export function buildSafeSoundEffectPrompt(
  scene: SoundscapeId,
  profiles: ProfileId[],
  config: AllConfig,
  customNotes?: string,
): string {
  const parts: string[] = [];
  
  // Base scene description
  switch (scene) {
    case "pinkNoiseRain":
      parts.push("Gentle pink noise rain, soft steady droplets on leaves");
      break;
    case "ocean":
      parts.push("Calm ocean waves, distant gentle surf, no crashing or sudden swells");
      break;
    case "forest":
      parts.push("Quiet forest ambience, soft rustling leaves, distant bird calls");
      break;
    case "studyRoom":
      parts.push("Subtle room tone, very quiet air circulation, peaceful indoor atmosphere");
      break;
    case "whiteNoise":
      parts.push("Soft white noise, even frequency distribution, no variation");
      break;
    case "custom":
      if (customNotes?.trim()) {
        parts.push(customNotes.trim());
      } else {
        parts.push("Calm ambient soundscape");
      }
      break;
  }
  
  // Core neurodivergent-safe constraints
  parts.push("Low to mid frequency range only, no harsh highs above 8kHz");
  parts.push("No sudden volume changes, onsets, or transient spikes");
  parts.push("Steady, predictable pattern with gentle variation only");
  parts.push("No speech, voices, music, or identifiable mechanical sounds");
  parts.push("Gentle stereo placement, avoid hard left/right panning");
  
  // Sensory profile adjustments
  if (profiles.includes("sensory")) {
    const saturation = (config.sensory?.saturation as number | undefined) ?? 35;
    const intensity = Math.max(20, Math.min(50, saturation)); // Clamp to safe range
    parts.push(`Very gentle intensity approximately ${intensity}% of full dynamic range`);
    parts.push("Extra soft attack and release on any elements");
  }
  
  // Autism profile adjustments  
  if (profiles.includes("autism")) {
    const bgMotion = (config.autism?.backgroundMotion as string | undefined) ?? "Static";
    if (bgMotion === "Static") {
      parts.push("Minimal variation, prefer static consistent texture");
    } else {
      parts.push("Only very subtle, repetitive background movement");
    }
    parts.push("Avoid any unpredictable or chaotic elements");
  }
  
  // ADHD profile adjustments
  if (profiles.includes("adhd")) {
    parts.push("Gentle masking quality to reduce external distractions");
    parts.push("Consistent rhythm if any temporal elements present");
  }
  
  // Dyslexia profile adjustments
  if (profiles.includes("dyslexia")) {
    parts.push("No rhythmic patterns that might compete with reading flow");
  }
  
  const prompt = parts.join(". ") + ".";
  
  // Ensure prompt isn't too long for the API
  return prompt.length > 1000 ? prompt.slice(0, 997) + "..." : prompt;
}