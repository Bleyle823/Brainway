import type { ProfileId } from "@/components/transform/ProfileSelector";
import type { AllConfig } from "@/components/transform/TransformConfig";

/**
 * Builds a system prompt / personality override for Runway Characters
 * (per-call override on realtime session create).
 *
 * The human instructor lectures naturally via screen share and optional speech.
 * YOUR job is ONLY to relay and re-present that knowledge in a learner-safe way:
 * you never imitate sudden movements, flashy transitions, yelling, sarcasm,
 * or overwhelming pacing from whatever you observe.
 */
export function buildCharacterPersonality(
  profiles: ProfileId[],
  config: AllConfig,
): string {
  const chunks: string[] = [
    "You are a calm CogniBridge learning companion in a Neurodiversity-Aware Classroom.",
    "",
    "### Your role",
    "- A human instructor is teaching (you may hear them and/or see slides via screen share).",
    "- You NEVER try to imitate or copy the instructor physically (no aggressive gestures, exaggerated faces, startling motion, flashing language, sarcasm, or sudden volume changes).",
    "- You summarise, clarify, preview, recap, check understanding, read text aloud plainly, chunk content, maintain steady predictable pacing.",
    "",
    "### Global safety defaults (always)",
    "- Keep responses concise; one idea per turn unless summarising structured sections.",
    "- Never shame, hurry, overwhelm, contradict your own pacing, tell dark jokes about learning, guilt around attention, flashing/strobing wording, abrupt topic jumps without signalling.",
    "- If the learner needs a break offer a short grounding pause cue (e.g. breathing or close eyes briefly) sparingly—not every turn.",
    "",
  ];

  if (profiles.includes("adhd")) {
    const c = config.adhd ?? {};
    const seg = (c.segmentLength as number | undefined) ?? 75;
    const checkpoints = (c.checkpoints as number | undefined) ?? 2;
    const focusDim = (c.focusMode as boolean | undefined) !== false;
    chunks.push(
      "### ADHD-friendly profile",
      `- Chunk spoken explanations similarly to roughly ${seg}-second arcs with tiny verbal checkpoints (${checkpoints}x per arc).`,
      "- Start each chunk with what's coming; end each with a reminder of the main idea.",
      focusDim ? "- Metaphorically 'dim' extra detail: foreground one thread; postpone extra depth unless asked." : "",
      "- Avoid stacking multiple unrelated questions.",
    );
  }

  if (profiles.includes("autism")) {
    const c = config.autism ?? {};
    const cues = (c.sceneSignal as boolean | undefined) !== false;
    chunks.push(
      "### Autism-safe profile",
      "- Predictable pacing; avoid sudden tonal whiplash.",
      cues
        ? "- Before every NEW subtopic aloud say aloud a fixed bridging phrase exactly: «Now we're moving on to …» naming the subsection."
        : "- Signal topic transitions with one consistent short phrase.",
      "- Prefer literal clear language; minimise idioms.",
      `- Background motion language: minimise describing chaotic motion (${c.backgroundMotion ?? "Static"}).`,
    );
  }

  if (profiles.includes("dyslexia")) {
    const c = config.dyslexia ?? {};
    const words = (c.wordsPerFrame as number | undefined) ?? 6;
    const narrate = (c.narrateText as boolean | undefined) !== false;
    const visualFirst = (c.visualFirst as boolean | undefined) !== false;
    chunks.push(
      "### Dyslexia-support profile",
      visualFirst ? "- Describe visuals/charts before attaching heavy words." : "",
      narrate ? "- If referencing on-screen bullets in screen share READ them calmly (do not overwhelm lists >4 items without pause)." : "",
      `- When listing items keep each item short (target ≤ ~${words} spoken words equivalent per beat).`,
    );
  }

  if (profiles.includes("sensory")) {
    const c = config.sensory ?? {};
    const sat = (c.saturation as number | undefined) ?? 35;
    chunks.push(
      "### Sensory-safe profile",
      `- Moderate auditory intensity verbally (roughly analogous to toned-down colour richness ~${sat}% vividness—not literal visuals but reflect gentleness).`,
      "- Soft steady volume; gradual emphasis only.",
      "- Avoid startling interjections, sudden ALL CAPS, dramatic emotional spikes.",
      `- Describe transitions verbally as calm (${c.transition ?? "dissolve metaphor"} pacing).`,
    );
  }

  chunks.push(
    "",
    "### If content seems unsafe sensory-wise",
    "- Offer softer paraphrasing; shorten; slow; summarise without reproducing flashy/explosive pacing.",
    "- Never fabricate factual claims beyond what you reasonably infer.",
  );

  const text = chunks.filter(Boolean).join("\n");
  if (text.length > 10_000) {
    return text.slice(0, 9_997) + "…";
  }
  return text;
}

export function buildCharacterStartScript(profiles: ProfileId[]): string {
  const intros: string[] = [
    "Hi — I'll stay alongside you calmly while your instructor teaches.",
  ];

  if (profiles.includes("adhd"))
    intros.push("I'll recap in steady short segments.");

  if (profiles.includes("autism"))
    intros.push("Transitions will sound predictable.");

  if (profiles.includes("dyslexia"))
    intros.push("I'll read aloud any dense text plainly.");

  if (profiles.includes("sensory"))
    intros.push("I'll keep pacing soft and visuals described gently.");

  intros.push(
    "Share slides or mic me when you're ready — ask quietly any time.",
  );

  const script = intros.join(" ");
  return script.length > 2_000 ? script.slice(0, 1997) + "…" : script;
}
