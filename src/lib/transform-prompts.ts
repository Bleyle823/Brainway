import type { ProfileId } from "@/components/transform/ProfileSelector";
import type { AllConfig } from "@/components/transform/TransformConfig";
import { getLanguage } from "@/lib/languages";

/**
 * Builds a gen4_aleph video-to-video prompt from the user's selected
 * accessibility profiles and their per-profile configuration values.
 *
 * Aleph works best with concise action-verb prompts; each profile block
 * follows the "verb + description" pattern from the official prompting guide.
 */
export function buildTransformPrompt(
  profiles: ProfileId[],
  config: AllConfig,
  targetLanguageCode = "en",
): string {
  const lang = getLanguage(targetLanguageCode);
  const isNonEnglish = targetLanguageCode !== "en";

  const parts: string[] = [
    "Transform this educational video to be accessible for neurodivergent learners.",
  ];

  if (isNonEnglish) {
    parts.push(
      `Translate all on-screen text, titles, captions, and labels into ${lang.name} (${lang.nativeName}).` +
        ` If the presenter speaks in a language other than ${lang.name}, add clearly readable ${lang.name} subtitles at the bottom of the frame.` +
        (lang.rtl
          ? ` Text must be rendered right-to-left as required by ${lang.name} script.`
          : "") +
        ` Keep all translated text high-contrast, easy to read, and properly localised — not word-for-word machine-literal.`,
    );
  }

  if (profiles.includes("adhd")) {
    const cfg = config.adhd ?? {};
    const focus = cfg.focusMode !== false;
    parts.push(
      `Reduce peripheral visual distractions so attention stays on the main subject.` +
        (focus ? " Dim or blur edges to create a natural focus zone." : "") +
        " Keep pacing calm, steady, and predictable throughout.",
    );
  }

  if (profiles.includes("autism")) {
    const cfg = config.autism ?? {};
    const bgMotion = (cfg.backgroundMotion as string | undefined) ?? "Static";
    parts.push(
      "Replace all hard cuts with gentle dissolve or cross-fade transitions." +
        (bgMotion === "Static"
          ? " Keep backgrounds static and visually consistent across scenes."
          : " Use only very subtle, looping background motion.") +
        " Maintain a predictable, uniform visual structure throughout the video.",
    );
  }

  if (profiles.includes("dyslexia")) {
    const cfg = config.dyslexia ?? {};
    const words = (cfg.wordsPerFrame as number | undefined) ?? 6;
    const scale = (cfg.textScale as number | undefined) ?? 1.5;
    parts.push(
      `Minimise on-screen text to at most ${words} words per frame.` +
        ` Make any remaining text high-contrast, large (${scale}× default size), and clearly readable.` +
        " Show visual demonstrations before text labels appear.",
    );
  }

  if (profiles.includes("sensory")) {
    const cfg = config.sensory ?? {};
    const sat = (cfg.saturation as number | undefined) ?? 35;
    const transition = (cfg.transition as string | undefined) ?? "Dissolve only";
    parts.push(
      `Desaturate the colour palette so colours appear at roughly ${sat}% of their original intensity — muted, calm tones only.` +
        ` Use ${transition.toLowerCase()} for every scene change; remove all flash effects and sudden brightness changes.` +
        " Soften any harsh audio peaks throughout.",
    );
  }

  parts.push(
    "Preserve the original educational content, presenter, and spoken audio. " +
      "Keep the video calm, gentle, and visually comfortable.",
  );

  if (isNonEnglish) {
    parts.push(
      `Final output: all visible text must be in ${lang.name}. Accessibility modifications and language adaptation should work together — do not sacrifice either for the other.`,
    );
  }

  return parts.join(" ");
}
