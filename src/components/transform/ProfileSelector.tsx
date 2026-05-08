import { motion } from "motion/react";
import { Brain, Shield, BookOpen, Waves } from "@phosphor-icons/react";

export type ProfileId = "adhd" | "autism" | "dyslexia" | "sensory";

export interface Profile {
  id: ProfileId;
  label: string;
  tagline: string;
  description: string;
  icon: React.ComponentType<{ className?: string; style?: React.CSSProperties; weight?: "fill" | "regular" | "bold" | "thin" | "light" | "duotone" }>;
  changes: string[];
  accentColor: string;
  accentBg: string;
  accentBorder: string;
  accentTag: string;
}

/** Grayscale-only accents — four lightness steps */
export const PROFILES: Profile[] = [
  {
    id: "adhd",
    label: "ADHD Mode",
    tagline: "Focus anchors & pacing control",
    description:
      "Splits video into 60–90 second segments with checkpoint summaries, a visible progress bar, and optional focus-mode that dims peripheral content.",
    icon: Brain,
    changes: ["60–90s segments", "Checkpoint summaries", "Progress bar", "Focus-mode dimming"],
    accentColor: "rgba(17,24,39,0.92)",
    accentBg: "rgba(255,255,255,0.55)",
    accentBorder: "rgba(55,65,81,0.35)",
    accentTag: "rgba(31,41,55,0.92)",
  },
  {
    id: "autism",
    label: "Autism-Safe Mode",
    tagline: "Predictable, consistent behaviour",
    description:
      "Eliminates unpredictable transitions, standardises presenter gestures to a scripted set, and signals every scene change with a consistent audio cue.",
    icon: Shield,
    changes: ["Scripted gesture set", "Dissolve-only transitions", "Audio scene cues", "Static backgrounds"],
    accentColor: "rgba(55,65,81,0.95)",
    accentBg: "rgba(229,231,235,0.75)",
    accentBorder: "rgba(107,114,128,0.45)",
    accentTag: "rgba(31,41,55,0.88)",
  },
  {
    id: "dyslexia",
    label: "Dyslexia Mode",
    tagline: "Visual-first, minimal on-screen text",
    description:
      "Applies OpenDyslexic font, caps text to 6 words per frame, re-orders content to show visuals before words, and narrates every on-screen text element.",
    icon: BookOpen,
    changes: ["OpenDyslexic font", "≤6 words per frame", "Visual-first ordering", "All text narrated"],
    accentColor: "rgba(17,24,39,0.88)",
    accentBg: "rgba(243,244,246,0.9)",
    accentBorder: "rgba(156,163,175,0.55)",
    accentTag: "rgba(55,65,81,0.95)",
  },
  {
    id: "sensory",
    label: "Sensory Safe Mode",
    tagline: "Muted palette, levelled audio",
    description:
      "Desaturates the colour palette via Aleph, normalises all audio peaks, removes flash transitions, and caps background ambience at 15% volume.",
    icon: Waves,
    changes: ["Desaturated palette", "Audio peaks levelled", "Dissolves & fades only", "No lyric music"],
    accentColor: "rgba(31,41,55,1)",
    accentBg: "rgba(209,213,219,0.65)",
    accentBorder: "rgba(75,85,99,0.5)",
    accentTag: "rgba(17,24,39,0.95)",
  },
];

interface Props {
  selected: Set<ProfileId>;
  onToggle: (id: ProfileId) => void;
}

export default function ProfileSelector({ selected, onToggle }: Props) {
  return (
    <div className="grid sm:grid-cols-2 gap-4">
      {PROFILES.map((p, i) => {
        const isSelected = selected.has(p.id);
        return (
          <motion.button
            key={p.id}
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.07, duration: 0.4 }}
            onClick={() => onToggle(p.id)}
            className={`relative text-left p-6 rounded-[1.5rem] border overflow-hidden transition-all duration-200 group ${
              isSelected
                ? "bg-white/90 border-neutral-400/70 shadow-sm"
                : "bg-white/50 border-neutral-300/55 hover:bg-white/75 hover:border-neutral-400/60"
            }`}
          >
            {isSelected && (
              <div
                className="absolute inset-0 pointer-events-none rounded-[1.5rem]"
                style={{
                  background: `radial-gradient(ellipse at top left, rgba(229,231,235,0.65) 0%, transparent 65%)`,
                }}
              />
            )}

            <div className="relative z-10">
              <div className="flex items-start justify-between mb-5">
                <div
                  className="w-11 h-11 rounded-2xl flex items-center justify-center border transition-all"
                  style={{
                    backgroundColor: isSelected ? p.accentBg : "rgba(243,244,246,0.9)",
                    borderColor: isSelected ? p.accentBorder : "rgba(209,213,219,0.9)",
                  }}
                >
                  <p.icon
                    className="w-5 h-5 transition-colors"
                    weight="fill"
                    style={{ color: isSelected ? p.accentColor : "rgba(75,85,99,0.85)" }}
                  />
                </div>

                <div
                  className={`w-5 h-5 rounded-full border-2 flex items-center justify-center transition-all shrink-0 ${
                    isSelected ? "border-neutral-900 bg-neutral-900" : "border-neutral-400 bg-transparent"
                  }`}
                >
                  {isSelected && (
                    <svg viewBox="0 0 10 8" className="w-2.5 h-2.5" fill="none">
                      <path
                        d="M1 4l2.5 2.5L9 1"
                        stroke="white"
                        strokeWidth="1.6"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      />
                    </svg>
                  )}
                </div>
              </div>

              <h3 className="text-base font-normal text-neutral-950 mb-0.5 leading-tight">{p.label}</h3>
              <p className="text-xs text-neutral-600 mb-3">{p.tagline}</p>
              <p className="text-sm text-neutral-700 leading-relaxed mb-5">{p.description}</p>

              <div className="flex flex-wrap gap-1.5">
                {p.changes.map((c) => (
                  <span
                    key={c}
                    className="text-xs px-2.5 py-1 rounded-full border transition-all"
                    style={{
                      backgroundColor: isSelected ? p.accentBg : "rgba(243,244,246,0.9)",
                      borderColor: isSelected ? p.accentBorder : "rgba(209,213,219,0.9)",
                      color: isSelected ? p.accentTag : "rgba(75,85,99,0.85)",
                    }}
                  >
                    {c}
                  </span>
                ))}
              </div>
            </div>
          </motion.button>
        );
      })}
    </div>
  );
}
