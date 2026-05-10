import type { ProfileId } from "@/components/transform/ProfileSelector";

/**
 * Builds a learner-safe Gen4.5 prompt by merging educator input with 
 * neurodivergent-friendly video generation constraints.
 * 
 * Enforces Runway's ≤1000 UTF-16 character limit while prioritizing
 * accessibility guidance over user text when length conflicts arise.
 */
export function buildEducatorGenPrompt(
  userPrompt: string,
  profiles: ProfileId[] = [],
): string {
  const baseConstraints = [
    "Create a calm, educational video with gentle pacing and soft natural lighting.",
    "Use smooth, steady camera movements - no sudden pans, zooms, or jarring motion.",
    "Avoid flashing lights, strobing effects, rapid color changes, or overwhelming visual elements.",
    "Keep backgrounds simple and non-distracting.",
  ];

  const profileConstraints: string[] = [];

  if (profiles.includes("adhd")) {
    profileConstraints.push(
      "Maintain clear focus on the main subject with minimal peripheral distractions.",
    );
  }

  if (profiles.includes("autism")) {
    profileConstraints.push(
      "Use predictable, consistent visual patterns and avoid unexpected changes.",
    );
  }

  if (profiles.includes("dyslexia")) {
    profileConstraints.push(
      "Prioritize visual elements over text - show rather than tell.",
    );
  }

  if (profiles.includes("sensory")) {
    profileConstraints.push(
      "Use muted, desaturated colors and avoid high contrast or bright elements.",
    );
  }

  // Combine all constraints
  const systemGuidance = [...baseConstraints, ...profileConstraints].join(" ");
  
  // Reserve space for system guidance + separator
  const maxUserPromptLength = 1000 - systemGuidance.length - 10; // 10 chars for separator
  
  let trimmedUserPrompt = userPrompt.trim();
  if (trimmedUserPrompt.length > maxUserPromptLength) {
    trimmedUserPrompt = trimmedUserPrompt.substring(0, maxUserPromptLength).trim();
    // Try to break at word boundary
    const lastSpace = trimmedUserPrompt.lastIndexOf(" ");
    if (lastSpace > maxUserPromptLength * 0.8) {
      trimmedUserPrompt = trimmedUserPrompt.substring(0, lastSpace);
    }
  }

  // Combine user prompt with system guidance
  const finalPrompt = `${trimmedUserPrompt}. ${systemGuidance}`;
  
  // Final safety check - should never exceed 1000 chars due to our math above
  return finalPrompt.length <= 1000 
    ? finalPrompt 
    : finalPrompt.substring(0, 1000).trim();
}

/**
 * Validates that a prompt string fits within Runway's character limit
 */
export function validatePromptLength(prompt: string): boolean {
  return prompt.length <= 1000;
}

/**
 * Gets the available character budget for user input given selected profiles
 */
export function getAvailablePromptLength(profiles: ProfileId[] = []): number {
  // Build a sample prompt to measure system constraint overhead
  const samplePrompt = buildEducatorGenPrompt("", profiles);
  const systemOverhead = samplePrompt.length;
  return Math.max(0, 1000 - systemOverhead - 10); // 10 char buffer
}