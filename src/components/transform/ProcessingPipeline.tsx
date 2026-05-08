import { motion } from "motion/react";
import {
  Check,
  CircleNotch,
  Pulse,
  MusicNotes,
  Scissors,
  Palette,
  Stack,
  TextT,
  Person,
  ChartBar,
  Package,
} from "@phosphor-icons/react";
import { type ProfileId } from "./ProfileSelector";

interface PipelineStep {
  id: string;
  label: string;
  detail: string;
  icon: React.ComponentType<{ className?: string; weight?: "fill" | "regular" }>;
  profiles: (ProfileId | "always")[];
}

const ALL_STEPS: PipelineStep[] = [
  {
    id: "analyze",
    label: "Analysing video content",
    detail: "Parsing scenes, audio tracks, and on-screen text overlays",
    icon: Pulse,
    profiles: ["always"],
  },
  {
    id: "audio",
    label: "Normalising audio",
    detail: "Removing background noise and levelling peak volumes",
    icon: MusicNotes,
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
    icon: Stack,
    profiles: ["sensory", "autism"],
  },
  {
    id: "text",
    label: "Reformatting on-screen text",
    detail: "OpenDyslexic font applied, capped at 6 words per frame",
    icon: TextT,
    profiles: ["dyslexia"],
  },
  {
    id: "motion",
    label: "Calibrating presenter motion",
    detail: "Standardising gestures to scripted set, measuring pacing",
    icon: Person,
    profiles: ["autism"],
  },
  {
    id: "sss",
    label: "Sensory Safety Score check",
    detail: "Verifying all dimensions pass threshold — re-generating if not",
    icon: ChartBar,
    profiles: ["always"],
  },
  {
    id: "encode",
    label: "Encoding & packaging",
    detail: "Rendering the final accessible video file",
    icon: Package,
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
      <div>
        <div className="flex items-center justify-between mb-2">
          <span className="text-xs uppercase tracking-[0.15em] text-neutral-500">
            {isDone ? "Complete" : "Processing"}
          </span>
          <span className="text-sm text-neutral-800">{progress}%</span>
        </div>
        <div className="h-1.5 rounded-full bg-neutral-200 overflow-hidden">
          <motion.div
            className="h-full rounded-full bg-neutral-900"
            initial={{ width: "0%" }}
            animate={{ width: `${progress}%` }}
            transition={{ duration: 0.5, ease: "easeInOut" }}
          />
        </div>
      </div>

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
                  ? "bg-neutral-100 border border-neutral-300 shadow-sm"
                  : status === "done"
                    ? "bg-neutral-50 border border-neutral-200"
                    : "bg-transparent border border-transparent"
              }`}
            >
              <div
                className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 transition-all ${
                  status === "done"
                    ? "bg-neutral-900"
                    : status === "active"
                      ? "bg-neutral-50 border border-neutral-300"
                      : "bg-neutral-100 border border-neutral-200"
                }`}
              >
                {status === "done" ? (
                  <Check className="w-3.5 h-3.5 text-neutral-50" weight="bold" />
                ) : status === "active" ? (
                  <CircleNotch className="w-3.5 h-3.5 text-neutral-900 animate-spin" weight="bold" />
                ) : (
                  <step.icon className="w-3.5 h-3.5 text-neutral-400" weight="fill" />
                )}
              </div>

              <div className="flex-1 min-w-0">
                <p
                  className={`text-sm leading-tight ${
                    status === "pending" ? "text-neutral-500" : "text-neutral-800"
                  }`}
                >
                  {step.label}
                </p>
                {status === "active" && (
                  <motion.p
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    className="text-xs text-neutral-500 mt-0.5"
                  >
                    {step.detail}
                  </motion.p>
                )}
              </div>

              {status === "done" && step.id === "sss" && score !== undefined && (
                <div className="text-right shrink-0">
                  <p className="text-xs text-neutral-500">SSS</p>
                  <p className="text-sm text-neutral-800">{score}/100</p>
                </div>
              )}
            </motion.div>
          );
        })}
      </div>

      {isDone && score !== undefined && (
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="rounded-[1.25rem] bg-neutral-100 border border-neutral-300 px-5 py-4 flex items-center justify-between"
        >
          <div>
            <p className="text-xs uppercase tracking-[0.15em] text-neutral-500">Sensory Safety Score</p>
            <p className="text-2xl font-normal text-neutral-900 mt-0.5">
              {score}
              <span className="text-sm text-neutral-500">/100</span>
            </p>
          </div>
          <div
            className={`px-3.5 py-1.5 rounded-full text-xs border ${
              score >= 80
                ? "bg-neutral-50 border-neutral-800 text-neutral-900"
                : "bg-neutral-50 border-neutral-400 text-neutral-700"
            }`}
          >
            {score >= 80 ? "Passed — delivering" : "Needs refinement — re-running"}
          </div>
        </motion.div>
      )}
    </div>
  );
}
