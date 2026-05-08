import { motion } from "motion/react";
import { Brain, Shield, BookOpen, Waves } from "lucide-react";

export type ProfileId = "adhd" | "autism" | "dyslexia" | "sensory";

export interface Profile {
  id: ProfileId;
  label: string;
  tagline: string;
  description: string;
  icon: React.ComponentType<{ className?: string; style?: React.CSSProperties }>;
  changes: string[];
  accentColor: string;
  accentBg: string;
  accentBorder: string;
  accentTag: string;
}

export const PROFILES: Profile[] = [
  {
    id: "adhd",
    label: "ADHD Mode",
    tagline: "Focus anchors & pacing control",
    description:
      "Splits video into 60–90 second segments with checkpoint summaries, a visible progress bar, and optional focus-mode that dims peripheral content.",
    icon: Brain,
    changes: ["60–90s segments", "Checkpoint summaries", "Progress bar", "Focus-mode dimming"],
    accentColor: "rgba(99,89,200,0.85)",
    accentBg: "rgba(99,89,200,0.06)",
    accentBorder: "rgba(99,89,200,0.18)",
    accentTag: "rgba(99,89,200,0.75)",
  },
  {
    id: "autism",
    label: "Autism-Safe Mode",
    tagline: "Predictable, consistent behaviour",
    description:
      "Eliminates unpredictable transitions, standardises presenter gestures to a scripted set, and signals every scene change with a consistent audio cue.",
    icon: Shield,
    changes: ["Scripted gesture set", "Dissolve-only transitions", "Audio scene cues", "Static backgrounds"],
    accentColor: "rgba(20,148,136,0.85)",
    accentBg: "rgba(20,148,136,0.06)",
    accentBorder: "rgba(20,148,136,0.18)",
    accentTag: "rgba(20,148,136,0.75)",
  },
  {
    id: "dyslexia",
    label: "Dyslexia Mode",
    tagline: "Visual-first, minimal on-screen text",
    description:
      "Applies OpenDyslexic font, caps text to 6 words per frame, re-orders content to show visuals before words, and narrates every on-screen text element.",
    icon: BookOpen,
    changes: ["OpenDyslexic font", "≤6 words per frame", "Visual-first ordering", "All text narrated"],
    accentColor: "rgba(194,122,14,0.85)",
    accentBg: "rgba(194,122,14,0.06)",
    accentBorder: "rgba(194,122,14,0.18)",
    accentTag: "rgba(194,122,14,0.75)",
  },
  {
    id: "sensory",
    label: "Sensory Safe Mode",
    tagline: "Muted palette, levelled audio",
    description:
      "Desaturates the colour palette via Aleph, normalises all audio peaks, removes flash transitions, and caps background ambience at 15% volume.",
    icon: Waves,
    changes: ["Desaturated palette", "Audio peaks levelled", "Dissolves & fades only", "No lyric music"],
    accentColor: "rgba(52,120,68,0.85)",
    accentBg: "rgba(52,120,68,0.06)",
    accentBorder: "rgba(52,120,68,0.18)",
    accentTag: "rgba(52,120,68,0.75)",
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
                ? "bg-white/85 border-white/70 shadow-sm"
                : "bg-white/40 border-white/40 hover:bg-white/65 hover:border-white/55"
            }`}
          >
            {isSelected && (
              <div
                className="absolute inset-0 pointer-events-none rounded-[1.5rem]"
                style={{
                  background: `radial-gradient(ellipse at top left, ${p.accentBg.replace("0.06", "0.12")} 0%, transparent 65%)`,
                }}
              />
            )}

            <div className="relative z-10">
              <div className="flex items-start justify-between mb-5">
                <div
                  className="w-11 h-11 rounded-2xl flex items-center justify-center border transition-all"
                  style={{
                    backgroundColor: isSelected ? p.accentBg : "rgba(30,50,90,0.04)",
                    borderColor: isSelected ? p.accentBorder : "rgba(30,50,90,0.1)",
                  }}
                >
                  <p.icon
                    className="w-5 h-5 transition-colors"
                    style={{ color: isSelected ? p.accentColor : "rgba(30,50,90,0.55)" }}
                  />
                </div>

                <div
                  className={`w-5 h-5 rounded-full border-2 flex items-center justify-center transition-all shrink-0 ${
                    isSelected
                      ? "border-[#3b3a52] bg-[#3b3a52]"
                      : "border-[rgba(30,50,90,0.2)] bg-transparent"
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

              <h3 className="text-base font-normal text-[#3b3a52] mb-0.5 leading-tight">
                {p.label}
              </h3>
              <p className="text-xs text-[rgba(30,50,90,0.45)] mb-3">{p.tagline}</p>
              <p className="text-sm text-[rgba(30,50,90,0.65)] leading-relaxed mb-5">
                {p.description}
              </p>

              <div className="flex flex-wrap gap-1.5">
                {p.changes.map((c) => (
                  <span
                    key={c}
                    className="text-xs px-2.5 py-1 rounded-full border transition-all"
                    style={{
                      backgroundColor: isSelected ? p.accentBg : "rgba(30,50,90,0.04)",
                      borderColor: isSelected ? p.accentBorder : "rgba(30,50,90,0.1)",
                      color: isSelected ? p.accentTag : "rgba(30,50,90,0.5)",
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
