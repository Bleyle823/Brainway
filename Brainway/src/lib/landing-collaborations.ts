/**
 * Partners and cosign slots for the landing page (ticker, feature strip, collaborations grid).
 * Replace names and links with real organisations as they are confirmed.
 */
export type LandingCollaboration = {
  name: string;
  role: string;
  href?: string;
};

export const LANDING_COLLABORATIONS: LandingCollaboration[] = [
  {
    name: "Runway",
    role: "Video and Characters APIs",
    href: "https://runwayml.com/",
  },
  {
    name: "Recall.ai",
    role: "Live meeting bots",
    href: "https://www.recall.ai/",
  },
  {
    name: "Research collaborators",
    role: "Sensory aware learning pilots",
  },
  {
    name: "School and clinic cosigns",
    role: "Programs you can name here as they commit",
  },
];
