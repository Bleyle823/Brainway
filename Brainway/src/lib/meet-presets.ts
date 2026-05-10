import type { ProfileId } from "@/components/transform/ProfileSelector";

export const VALID_PROFILE_IDS: ProfileId[] = ["adhd", "autism", "dyslexia", "sensory"];

export const MEET_PROFILE_PRESETS: ReadonlyArray<{
  id: string;
  label: string;
  description: string;
  profiles: ProfileId[];
}> = [
  {
    id: "adhd",
    label: "ADHD-focused",
    description: "Short segments, checkpoints, steady pacing",
    profiles: ["adhd"],
  },
  {
    id: "sensory",
    label: "Sensory calm",
    description: "Soft emphasis, gentle transitions",
    profiles: ["sensory"],
  },
  {
    id: "multiple",
    label: "Multiple needs",
    description: "All accommodation modes together",
    profiles: ["adhd", "autism", "dyslexia", "sensory"],
  },
];

/** Parse comma-separated profile ids from URL; unknown tokens are dropped. */
export function parseProfilesSearchParam(param: string | undefined): Set<ProfileId> | null {
  if (!param?.trim()) return null;
  const next = new Set<ProfileId>();
  for (const part of param.split(",")) {
    const id = part.trim() as ProfileId;
    if (VALID_PROFILE_IDS.includes(id)) next.add(id);
  }
  return next.size > 0 ? next : null;
}
