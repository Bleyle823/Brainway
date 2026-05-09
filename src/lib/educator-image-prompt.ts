import type { ProfileId } from "@/components/transform/ProfileSelector";
import type { AllConfig } from "@/components/transform/TransformConfig";
import { getLanguage } from "@/lib/languages";

/**
 * "new" = text-only brief;
 * "adaptReference" = single reference, preserve subject while applying rules;
 * "imageToImage" = transform @primary (required), optional @secondary for mild style/layout hints.
 */
export type ImagePromptKind = "new" | "adaptReference" | "imageToImage";

/**
 * Builds a gen4_image text-to-image prompt from the user's selected
 * accessibility profiles and their per-profile configuration values.
 *
 * Optimized for still educational illustrations that are calm and
 * predictable for neurodivergent learners.
 */
export function buildEducatorSafeImagePrompt(
  profiles: ProfileId[],
  config: AllConfig,
  targetLanguageCode = "en",
  userPromptText: string,
  promptKind: ImagePromptKind = "new",
  /** When promptKind is imageToImage and a second reference is supplied (@secondary). */
  hasSecondReference = false,
): string {
  const lang = getLanguage(targetLanguageCode);
  const isNonEnglish = targetLanguageCode !== "en";

  let opening: string[];
  if (promptKind === "adaptReference") {
    opening = [
      "Using the provided reference image as the basis, recreate a new educational illustration that preserves the core subject matter and learning goal while making it calm and predictable for neurodivergent learners.",
    ];
  } else if (promptKind === "imageToImage") {
    opening = [
      "Image-to-image transformation: treat @primary as the main input. Produce one new educational illustration that preserves the teaching intent and core subject of @primary while applying the neurodivergent-safe requirements below.",
    ];
    if (hasSecondReference) {
      opening.push(
        "@secondary is optional context only—borrow at most subtle palette or spacing rhythm; do not copy busy patterns, small text, or high-sensory detail from @secondary.",
      );
    }
  } else {
    opening = [
      "Create an educational illustration that is calm and predictable for neurodivergent learners.",
    ];
  }

  const parts: string[] = [...opening];

  if (isNonEnglish) {
    parts.push(
      `Render all text, labels, and captions in ${lang.name} (${lang.nativeName}).` +
        (lang.rtl
          ? ` Text must be rendered right-to-left as required by ${lang.name} script.`
          : "") +
        ` Keep all text high-contrast, clearly readable, and properly localized.`,
    );
  }

  if (profiles.includes("adhd")) {
    const cfg = config.adhd ?? {};
    const focus = cfg.focusMode !== false;
    parts.push(
      "Single clear focal subject with minimal background clutter." +
        (focus ? " Use natural depth of field to emphasize the main subject." : "") +
        " Organize elements in a predictable, structured layout.",
    );
  }

  if (profiles.includes("autism")) {
    const cfg = config.autism ?? {};
    const bgMotion = (cfg.backgroundMotion as string | undefined) ?? "Static";
    parts.push(
      "Stable, symmetrical composition with soft, rounded edges." +
        (bgMotion === "Static"
          ? " Use solid, uniform backgrounds without patterns or textures."
          : " Include only very subtle, repetitive background elements.") +
        " Maintain consistent visual structure and predictable placement of elements.",
    );
  }

  if (profiles.includes("dyslexia")) {
    const cfg = config.dyslexia ?? {};
    const words = (cfg.wordsPerFrame as number | undefined) ?? 6;
    const scale = (cfg.textScale as number | undefined) ?? 1.5;
    parts.push(
      `Minimize text to maximum ${words} words total.` +
        ` Make any text extra large (${scale}× normal size), high-contrast, and use clear, simple fonts.` +
        " Prioritize visual symbols and icons over written text.",
    );
  }

  if (profiles.includes("sensory")) {
    const cfg = config.sensory ?? {};
    const sat = (cfg.saturation as number | undefined) ?? 35;
    parts.push(
      `Use a muted color palette at roughly ${sat}% saturation intensity — soft, calming tones only.` +
        " Avoid high contrast boundaries, sharp edges, or bright accent colors." +
        " Create gentle color transitions and harmonious color relationships.",
    );
  }

  // Add the user's custom prompt
  if (userPromptText.trim()) {
    parts.push(userPromptText.trim());
  }

  parts.push("Professional educational illustration style, clean and approachable.");

  if (isNonEnglish) {
    parts.push(
      `Final output: all visible text must be in ${lang.name}. Accessibility features and language should work together seamlessly.`,
    );
  }

  const fullPrompt = parts.join(" ");

  // Enforce 1000 character limit for gen4_image
  if (fullPrompt.length > 1000) {
    throw new Error(
      `Prompt is too long (${fullPrompt.length} characters). The combined accessibility settings and your description must be under 1000 characters. Please shorten your description or reduce accessibility profiles.`
    );
  }

  return fullPrompt;
}