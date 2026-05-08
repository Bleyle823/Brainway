import { motion } from "motion/react";
import {
  Check,
  Loader2,
  Activity,
  Music2,
  Scissors,
  Palette,
  Layers,
  Type,
  PersonStanding,
  BarChart2,
  PackageCheck,
} from "lucide-react";
import { type ProfileId } from "./ProfileSelector";

interface PipelineStep {
  id: string;
  label: string;
  detail: string;
  icon: React.ComponentType<{ className?: string }>;
  profiles: (ProfileId | "always")[];
}

const ALL_STEPS: PipelineStep[] = [
  {
    id: "analyze",
    label: "Analysing video content",
    detail: "Parsing scenes, audio tracks, and on-screen text overlays",
    icon: Activity,
    profiles: ["always"],
  },
  {
    id: "audio",
    label: "Normalising audio",
    detail: "Removing background noise and levelling peak volumes",
    icon: Music2,
    profiles: ["always"],
  },
  {
    id: "segment",
    label: "Re-segmenting scenes",
    detail: "Breaking content into 60–90 second learning chunks with checkpoints",
    icon: Scissors,
    profiles: ["adhd"],
  },
  {
    id: "palette",
    label: "Applying safe colour palette",
    detail: "Desaturating colours and stabilising contrast ratios via Aleph",
    icon: Palette,
    profiles: ["sensory", "autism"],
  },
  {
    id: "transitions",
    label: "Smoothing transitions",
    detail: "Replacing hard cuts with dissolves and cross-fades",
    icon: Layers,
    profiles: ["sensory", "autism"],
  },
  {
    id: "text",
    label: "Reformatting on-screen text",
    detail: "OpenDyslexic font applied, capped at 6 words per frame",
    icon: Type,
    profiles: ["dyslexia"],
  },
  {
    id: "motion",
    label: "Calibrating presenter motion",
    detail: "Standardising gestures to scripted set, measuring pacing",
    icon: PersonStanding,
    profiles: ["autism"],
  },
  {
    id: "sss",
    label: "Sensory Safety Score check",
    detail: "Verifying all dimensions pass threshold — re-generating if not",
    icon: BarChart2,
    profiles: ["always"],
  },
  {
    id: "encode",
    label: "Encoding & packaging",
    detail: "Rendering the final accessible video file",
    icon: PackageCheck,
    profiles: ["always"],
  },
];

interface Props {
  selectedProfiles: Set<ProfileId>;
  currentStep: number;
  score?: number;
}

export default function ProcessingPipeline({ selectedProfiles, currentStep, score }: Props) {
  const activeSteps = ALL_STEPS.filter(
    (s) =>
      s.profiles.includes("always") ||
      s.profiles.some((p) => selectedProfiles.has(p as ProfileId)),
  );

  const clampedStep = Math.min(currentStep, activeSteps.length);
  const progress = activeSteps.length > 0 ? Math.round((clampedStep / activeSteps.length) * 100) : 0;
  const isDone = clampedStep >= activeSteps.length;

  return (
    <div className="space-y-6">
      {/* Progress bar */}
      <div>
        <div className="flex items-center justify-between mb-2">
          <span className="text-xs uppercase tracking-[0.15em] text-[rgba(30,50,90,0.5)]">
            {isDone ? "Complete" : "Processing"}
          </span>
          <span className="text-sm text-[#3b3a52]">{progress}%</span>
        </div>
        <div className="h-1.5 rounded-full bg-[rgba(30,50,90,0.1)] overflow-hidden">
          <motion.div
            className="h-full rounded-full bg-[#3b3a52]"
            initial={{ width: "0%" }}
            animate={{ width: `${progress}%` }}
            transition={{ duration: 0.5, ease: "easeInOut" }}
          />
        </div>
      </div>

      {/* Steps list */}
      <div className="space-y-2">
        {activeSteps.map((step, i) => {
          const status: "done" | "active" | "pending" =
            i < clampedStep ? "done" : i === clampedStep ? "active" : "pending";

          return (
            <motion.div
              key={step.id}
              initial={{ opacity: 0, x: -8 }}
              animate={{
                opacity: status === "pending" ? 0.4 : 1,
                x: 0,
              }}
              transition={{ delay: i * 0.05, duration: 0.3 }}
              className={`flex items-center gap-4 px-4 py-3.5 rounded-[1rem] transition-all ${
                status === "active"
                  ? "bg-white/75 border border-white/65 shadow-sm"
                  : status === "done"
                  ? "bg-white/30 border border-white/30"
                  : "bg-transparent border border-transparent"
              }`}
            >
              <div
                className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 transition-all ${
                  status === "done"
                    ? "bg-[#3b3a52]"
                    : status === "active"
                    ? "bg-white border border-[rgba(30,50,90,0.18)]"
                    : "bg-[rgba(30,50,90,0.05)] border border-[rgba(30,50,90,0.1)]"
                }`}
              >
                {status === "done" ? (
                  <Check className="w-3.5 h-3.5 text-white" />
                ) : status === "active" ? (
                  <Loader2 className="w-3.5 h-3.5 text-[#3b3a52] animate-spin" />
                ) : (
                  <step.icon className="w-3.5 h-3.5 text-[rgba(30,50,90,0.3)]" />
                )}
              </div>

              <div className="flex-1 min-w-0">
                <p
                  className={`text-sm leading-tight ${
                    status === "pending"
                      ? "text-[rgba(30,50,90,0.45)]"
                      : "text-[#3b3a52]"
                  }`}
                >
                  {step.label}
                </p>
                {status === "active" && (
                  <motion.p
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    className="text-xs text-[rgba(30,50,90,0.5)] mt-0.5"
                  >
                    {step.detail}
                  </motion.p>
                )}
              </div>

              {status === "done" && step.id === "sss" && score !== undefined && (
                <div className="text-right shrink-0">
                  <p className="text-xs text-[rgba(30,50,90,0.45)]">SSS</p>
                  <p className="text-sm text-[#3b3a52]">{score}/100</p>
                </div>
              )}
            </motion.div>
          );
        })}
      </div>

      {/* SSS badge on completion */}
      {isDone && score !== undefined && (
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="rounded-[1.25rem] bg-gradient-to-br from-[#cabfe0]/25 via-[#d8d3c2]/25 to-[#b8c8b1]/25 border border-white/55 px-5 py-4 flex items-center justify-between"
        >
          <div>
            <p className="text-xs uppercase tracking-[0.15em] text-[rgba(30,50,90,0.5)]">
              Sensory Safety Score
            </p>
            <p className="text-2xl font-normal text-[#3b3a52] mt-0.5">
              {score}
              <span className="text-sm text-[rgba(30,50,90,0.35)]">/100</span>
            </p>
          </div>
          <div
            className={`px-3.5 py-1.5 rounded-full text-xs border ${
              score >= 80
                ? "bg-[rgba(52,120,68,0.08)] border-[rgba(52,120,68,0.22)] text-[rgba(36,100,52,0.9)]"
                : "bg-[rgba(194,122,14,0.08)] border-[rgba(194,122,14,0.22)] text-[rgba(154,92,4,0.9)]"
            }`}
          >
            {score >= 80 ? "Passed — delivering" : "Needs refinement — re-running"}
          </div>
        </motion.div>
      )}
    </div>
  );
}
