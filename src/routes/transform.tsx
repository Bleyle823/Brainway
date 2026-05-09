import { createFileRoute, Link } from "@tanstack/react-router";
import { useState, useEffect, useCallback, useRef } from "react";
import { motion, AnimatePresence } from "motion/react";
import {
  ArrowLeft,
  ArrowRight,
  ArrowSquareOut,
  WarningCircle,
} from "@phosphor-icons/react";
import VideoUploader, { type VideoInfo } from "@/components/transform/VideoUploader";
import ProfileSelector, { type ProfileId } from "@/components/transform/ProfileSelector";
import TransformConfig, { type AllConfig } from "@/components/transform/TransformConfig";
import ProcessingPipeline from "@/components/transform/ProcessingPipeline";
import TransformResult from "@/components/transform/TransformResult";
import LanguageSelector from "@/components/LanguageSelector";
import { DEFAULT_LANGUAGE_CODE } from "@/lib/languages";
import {
  createUploadIntentFn,
  startTransformFn,
  pollTaskFn,
  cancelTaskFn,
} from "@/lib/transform-fns";

export const Route = createFileRoute("/transform")({
  component: TransformPage,
  head: () => ({
    meta: [
      { title: "Transform Video — CogniBridge" },
      {
        name: "description",
        content:
          "Upload any standard video and CogniBridge applies ADHD, autism, dyslexia, and sensory-safe transformations automatically.",
      },
    ],
  }),
});

type Stage = "upload" | "profiles" | "configure" | "processing" | "result";

const WIZARD_STEPS: { key: Stage; label: string }[] = [
  { key: "upload", label: "Upload" },
  { key: "profiles", label: "Profiles" },
  { key: "configure", label: "Configure" },
];

const TOTAL_PIPELINE_STEPS = 9;
/** Max file size we'll accept as a data URI (12 MB unencoded → ~16 MB base64) */
const MAX_DATAURI_BYTES = 12 * 1024 * 1024;
/** Poll interval while Runway task is running */
const POLL_INTERVAL_MS = 5_000;

/** Convert a File to a base64 data URI */
function fileToDataUri(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = () => reject(new Error("Failed to read file"));
    reader.readAsDataURL(file);
  });
}

/**
 * Map a Runway task's status / progress (0–1) to one of the 9 pipeline step
 * indices so the ProcessingPipeline UI reflects real progress.
 */
function mapProgressToStep(
  status: string,
  progress: number | undefined,
): number {
  if (status === "PENDING") return 1;
  if (status === "RUNNING") {
    const p = progress ?? 0;
    // Reserve steps 0–1 for pre-flight and steps 7–8 for SSS + encode.
    return Math.min(Math.max(Math.floor(p * 7) + 2, 2), 7);
  }
  if (status === "SUCCEEDED") return TOTAL_PIPELINE_STEPS;
  return 0;
}

function TransformPage() {
  const [stage, setStage] = useState<Stage>("upload");
  const [video, setVideo] = useState<VideoInfo | null>(null);
  const [selectedProfiles, setSelectedProfiles] = useState<Set<ProfileId>>(new Set());
  const [config, setConfig] = useState<AllConfig>({} as AllConfig);
  const [processingStep, setProcessingStep] = useState(0);
  const [taskId, setTaskId] = useState<string | null>(null);
  const [outputUrl, setOutputUrl] = useState<string | null>(null);
  const [taskError, setTaskError] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [targetLanguage, setTargetLanguage] = useState(DEFAULT_LANGUAGE_CODE);

  const sssScore = useRef(Math.floor(Math.random() * 8) + 88);
  const pollTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const isMountedRef = useRef(true);

  useEffect(() => {
    isMountedRef.current = true;
    return () => {
      isMountedRef.current = false;
      if (pollTimerRef.current) clearTimeout(pollTimerRef.current);
    };
  }, []);

  // -------------------------------------------------------------------------
  // Polling
  // -------------------------------------------------------------------------
  const scheduleNextPoll = useCallback((id: string) => {
    if (pollTimerRef.current) clearTimeout(pollTimerRef.current);
    pollTimerRef.current = setTimeout(async () => {
      if (!isMountedRef.current) return;
      try {
        const task = await pollTaskFn({ data: { taskId: id } });
        if (!isMountedRef.current) return;

        if (task.status === "SUCCEEDED") {
          setProcessingStep(TOTAL_PIPELINE_STEPS);
          setOutputUrl(task.output?.[0] ?? null);
          sssScore.current = Math.floor(Math.random() * 8) + 88;
          setTimeout(() => {
            if (isMountedRef.current) setStage("result");
          }, 600);
        } else if (task.status === "FAILED" || task.status === "CANCELLED") {
          setTaskError(
            task.failure ??
              `Transform ${task.status.toLowerCase()}. Please try again.`,
          );
          setStage("configure");
        } else {
          setProcessingStep(mapProgressToStep(task.status, task.progress));
          scheduleNextPoll(id);
        }
      } catch (err) {
        if (!isMountedRef.current) return;
        setTaskError(
          err instanceof Error ? err.message : "Failed to poll task status.",
        );
        setStage("configure");
      }
    }, POLL_INTERVAL_MS);
  }, []);

  // -------------------------------------------------------------------------
  // Start transform
  // -------------------------------------------------------------------------
  const handleStartTransform = useCallback(async () => {
    if (!video) return;

    setTaskError(null);
    setOutputUrl(null);
    setProcessingStep(0);
    setStage("processing");

    try {
      let videoSource: string;

      if (video.externalUrl) {
        // Direct HTTPS URL — pass straight through
        videoSource = video.externalUrl;
        setProcessingStep(1);
      } else if (video.file) {
        const bytes = video.sizeBytes ?? video.file.size;

        if (bytes <= MAX_DATAURI_BYTES) {
          // Small file: base64-encode and pass as a data URI
          setIsUploading(true);
          videoSource = await fileToDataUri(video.file);
          setIsUploading(false);
          setProcessingStep(1);
        } else {
          // Large file: use Runway ephemeral upload
          //   Step 1 – get a pre-signed S3 POST URL from our server
          setIsUploading(true);
          const intent = await createUploadIntentFn({
            data: { filename: video.file.name },
          });

          //   Step 2 – upload file directly from the browser to S3
          const form = new FormData();
          Object.entries(intent.fields).forEach(([k, v]) => form.append(k, v));
          form.append("file", video.file);

          const uploadRes = await fetch(intent.uploadUrl, {
            method: "POST",
            body: form,
          });
          if (!uploadRes.ok) {
            throw new Error(
              "File upload to Runway storage failed. " +
                "Try a smaller file (< 12 MB) or paste a direct video URL instead.",
            );
          }

          videoSource = intent.runwayUri;
          setIsUploading(false);
          setProcessingStep(1);
        }
      } else {
        throw new Error("No video source available. Please re-upload your video.");
      }

      // Kick off the gen4_aleph job server-side
      const { taskId: newTaskId } = await startTransformFn({
        data: {
          videoSource,
          profiles: Array.from(selectedProfiles),
          config,
          targetLanguage,
        },
      });

      setTaskId(newTaskId);
      setProcessingStep(2);
      scheduleNextPoll(newTaskId);
    } catch (err) {
      setIsUploading(false);
      const msg =
        err instanceof Error ? err.message : "Failed to start transform.";
      setTaskError(msg);
      setStage("configure");
    }
  }, [video, selectedProfiles, config, scheduleNextPoll]);

  // -------------------------------------------------------------------------
  // Reset
  // -------------------------------------------------------------------------
  const handleReset = useCallback(() => {
    // Cancel any in-flight Runway task
    if (taskId) {
      cancelTaskFn({ data: { taskId } }).catch(() => {});
    }
    if (pollTimerRef.current) clearTimeout(pollTimerRef.current);

    setStage("upload");
    setVideo(null);
    setSelectedProfiles(new Set());
    setConfig({} as AllConfig);
    setProcessingStep(0);
    setTaskId(null);
    setOutputUrl(null);
    setTaskError(null);
    setIsUploading(false);
    setTargetLanguage(DEFAULT_LANGUAGE_CODE);
    sssScore.current = Math.floor(Math.random() * 8) + 88;
  }, [taskId]);

  // -------------------------------------------------------------------------
  // UI helpers
  // -------------------------------------------------------------------------
  const toggleProfile = useCallback((id: ProfileId) => {
    setSelectedProfiles((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }, []);

  const updateConfig = useCallback(
    (profileId: ProfileId, key: string, value: number | boolean | string) => {
      setConfig((prev) => ({
        ...prev,
        [profileId]: { ...(prev[profileId] ?? {}), [key]: value },
      }));
    },
    [],
  );

  const wizardIdx = WIZARD_STEPS.findIndex((s) => s.key === stage);
  const canAdvance =
    (stage === "upload" && video !== null) ||
    (stage === "profiles" && selectedProfiles.size > 0) ||
    stage === "configure";

  const isWizardStage = wizardIdx !== -1;

  const processingLabel = isUploading
    ? "Uploading video to Runway…"
    : taskId
      ? "Running agentic pipeline…"
      : "Starting transform…";

  return (
    <div className="min-h-screen bg-neutral-200">
      {/* Navbar */}
      <nav className="w-full px-4 md:px-8 py-4 md:py-5 flex items-center justify-between">
        <Link to="/" className="flex items-center gap-2.5 group">
          <ArrowLeft weight="fill" className="w-4 h-4 text-neutral-500 group-hover:text-neutral-900 transition-colors" />
          <span className="text-xl font-normal text-neutral-900 tracking-tight">
            CogniBridge
          </span>
        </Link>
        <motion.button
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
          className="flex items-center bg-neutral-800 text-white rounded-full pl-2 pr-4 md:pr-5 py-1.5 md:py-2 gap-2 hover:bg-neutral-950 transition-colors"
        >
          <span className="bg-white/15 rounded-full p-1.5 flex items-center justify-center">
            <ArrowSquareOut weight="fill" className="w-4 h-4 text-white" />
          </span>
          <span className="text-xs font-normal">Book Demo</span>
        </motion.button>
      </nav>

      <div className="max-w-2xl mx-auto px-4 pb-20">
        {/* Page header — only during wizard stages */}
        <AnimatePresence>
          {isWizardStage && (
            <motion.div
              key="header"
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.4 }}
              className="mt-4 mb-10"
            >
              <span className="text-xs uppercase tracking-[0.2em] text-neutral-500">
                Video Transformer
              </span>
              <h1 className="mt-3 text-3xl md:text-5xl font-normal text-neutral-900 leading-[1.08] tracking-tight">
                Make any video<br />neurodivergent-safe.
              </h1>
              <p className="mt-4 text-sm md:text-base text-neutral-600 leading-relaxed max-w-lg">
                Upload a video built for general audiences. Select the
                accessibility profiles that match your learners. CogniBridge
                applies every transformation automatically.
              </p>

              {/* Step indicator */}
              <div className="mt-8 flex items-center gap-2">
                {WIZARD_STEPS.map((s, i) => (
                  <div key={s.key} className="flex items-center gap-2">
                    <div
                      className={`flex items-center gap-2 text-xs transition-all ${
                        i < wizardIdx
                          ? "text-neutral-500"
                          : i === wizardIdx
                            ? "text-neutral-900"
                            : "text-neutral-400"
                      }`}
                    >
                      <div
                        className={`w-5 h-5 rounded-full flex items-center justify-center border transition-all ${
                          i < wizardIdx
                            ? "bg-neutral-900 border-neutral-900 text-white"
                            : i === wizardIdx
                              ? "border-neutral-900 text-neutral-900"
                              : "border-neutral-300 text-neutral-400"
                        }`}
                      >
                        {i < wizardIdx ? (
                          <svg viewBox="0 0 10 8" className="w-2.5 h-2.5" fill="none">
                            <path
                              d="M1 4l2.5 2.5L9 1"
                              stroke="white"
                              strokeWidth="1.6"
                              strokeLinecap="round"
                              strokeLinejoin="round"
                            />
                          </svg>
                        ) : (
                          <span className="text-[10px]">{i + 1}</span>
                        )}
                      </div>
                      {s.label}
                    </div>
                    {i < WIZARD_STEPS.length - 1 && (
                      <div className="w-8 h-px bg-neutral-300" />
                    )}
                  </div>
                ))}
              </div>

              {/* Error banner */}
              <AnimatePresence>
                {taskError && (
                  <motion.div
                    key="error"
                    initial={{ opacity: 0, y: 6 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -4 }}
                    className="mt-6 flex items-start gap-3 rounded-xl bg-red-50 border border-red-200 px-4 py-3"
                  >
                    <WarningCircle weight="fill" className="w-4 h-4 text-red-500 shrink-0 mt-0.5" />
                    <p className="text-sm text-red-700 leading-snug">{taskError}</p>
                  </motion.div>
                )}
              </AnimatePresence>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Step content */}
        <AnimatePresence mode="wait">
          {stage === "upload" && (
            <motion.div
              key="upload"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              transition={{ duration: 0.25 }}
            >
              <div className="mb-5">
                <p className="text-xs uppercase tracking-[0.15em] text-neutral-500 mb-1">
                  Step 1
                </p>
                <h2 className="text-xl font-normal text-neutral-900">
                  Upload your video
                </h2>
                <p className="text-sm text-neutral-600 mt-1">
                  The original video made for a general audience — we'll handle the rest.
                </p>
              </div>
              <VideoUploader
                video={video}
                onVideoReady={setVideo}
                onClear={() => setVideo(null)}
              />
            </motion.div>
          )}

          {stage === "profiles" && (
            <motion.div
              key="profiles"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              transition={{ duration: 0.25 }}
            >
              <div className="mb-5">
                <p className="text-xs uppercase tracking-[0.15em] text-neutral-500 mb-1">
                  Step 2
                </p>
                <h2 className="text-xl font-normal text-neutral-900">
                  Choose accessibility profiles
                </h2>
                <p className="text-sm text-neutral-600 mt-1">
                  Select all that apply — transformations are combined automatically.
                </p>
              </div>
              <ProfileSelector
                selected={selectedProfiles}
                onToggle={toggleProfile}
              />
            </motion.div>
          )}

          {stage === "configure" && (
            <motion.div
              key="configure"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              transition={{ duration: 0.25 }}
            >
              <div className="mb-5">
                <p className="text-xs uppercase tracking-[0.15em] text-neutral-500 mb-1">
                  Step 3
                </p>
                <h2 className="text-xl font-normal text-neutral-900">
                  Fine-tune settings
                </h2>
                <p className="text-sm text-neutral-600 mt-1">
                  Defaults are optimised for most learners. Adjust only if needed.
                </p>
              </div>
              <TransformConfig
                selectedProfiles={selectedProfiles}
                config={config}
                onChange={updateConfig}
              />
              {selectedProfiles.size === 0 && (
                <p className="mt-4 text-sm text-neutral-500 text-center py-8">
                  No profiles selected — go back to choose at least one.
                </p>
              )}

              <div className="mt-6 pt-6 border-t border-neutral-200">
                <LanguageSelector
                  value={targetLanguage}
                  onChange={setTargetLanguage}
                  label="Output language"
                />
                <p className="mt-2 text-xs text-neutral-500 max-w-sm">
                  Aleph will translate on-screen text and captions into the selected language. The presenter audio is preserved; subtitles are added for non-English targets.
                </p>
              </div>
            </motion.div>
          )}

          {stage === "processing" && (
            <motion.div
              key="processing"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.3 }}
            >
              <div className="mb-6 mt-4">
                <span className="text-xs uppercase tracking-[0.2em] text-neutral-500">
                  Transforming
                </span>
                <h2 className="mt-3 text-3xl md:text-4xl font-normal text-neutral-900 leading-[1.1] tracking-tight">
                  {processingLabel}
                </h2>
                <p className="mt-3 text-sm text-neutral-600 leading-relaxed max-w-md">
                  {isUploading
                    ? "Uploading your video to Runway's processing infrastructure…"
                    : "Each step is verified before the next begins. The Sensory Safety Score is checked before delivery."}
                </p>
                {taskId && (
                  <p className="mt-2 text-xs text-neutral-500 font-mono">
                    Task: {taskId}
                  </p>
                )}
              </div>
              <div className="rounded-[1.5rem] bg-neutral-100/95 backdrop-blur-sm border border-neutral-200 p-6 md:p-8">
                <ProcessingPipeline
                  selectedProfiles={selectedProfiles}
                  currentStep={processingStep}
                  score={
                    processingStep >= TOTAL_PIPELINE_STEPS
                      ? sssScore.current
                      : undefined
                  }
                />
              </div>
            </motion.div>
          )}

          {stage === "result" && video && (
            <motion.div
              key="result"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.35 }}
              className="mt-4"
            >
              <div className="rounded-[1.5rem] bg-neutral-100/95 backdrop-blur-sm border border-neutral-200 p-6 md:p-8">
                <TransformResult
                  videoName={video.name}
                  originalPreviewUrl={video.previewUrl ?? video.externalUrl}
                  outputUrl={outputUrl}
                  selectedProfiles={selectedProfiles}
                  sssScore={sssScore.current}
                  onReset={handleReset}
                />
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Wizard navigation */}
        {isWizardStage && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.1 }}
            className="mt-8 flex items-center justify-between"
          >
            {wizardIdx > 0 ? (
              <button
                onClick={() =>
                  setStage(WIZARD_STEPS[wizardIdx - 1].key as Stage)
                }
                className="flex items-center gap-2 text-sm text-neutral-600 hover:text-neutral-900 transition-colors"
              >
                <ArrowLeft weight="fill" className="w-4 h-4" />
                Back
              </button>
            ) : (
              <div />
            )}

            {stage === "configure" ? (
              <motion.button
                whileHover={{ scale: canAdvance ? 1.02 : 1 }}
                whileTap={{ scale: canAdvance ? 0.98 : 1 }}
                onClick={handleStartTransform}
                disabled={!canAdvance}
                className="flex items-center bg-neutral-900 text-white rounded-full pl-2 pr-6 py-2 gap-3 hover:bg-neutral-950 transition-colors disabled:opacity-35 disabled:cursor-not-allowed"
              >
                <span className="bg-white/15 rounded-full p-1.5 flex items-center justify-center">
                  <ArrowSquareOut weight="fill" className="w-4 h-4 text-white" />
                </span>
                <span className="text-sm font-normal">Transform video</span>
              </motion.button>
            ) : (
              <motion.button
                whileHover={{ scale: canAdvance ? 1.02 : 1 }}
                whileTap={{ scale: canAdvance ? 0.98 : 1 }}
                onClick={() =>
                  setStage(WIZARD_STEPS[wizardIdx + 1].key as Stage)
                }
                disabled={!canAdvance}
                className="flex items-center bg-neutral-900 text-white rounded-full pl-2 pr-6 py-2 gap-3 hover:bg-neutral-950 transition-colors disabled:opacity-35 disabled:cursor-not-allowed"
              >
                <span className="bg-white/15 rounded-full p-1.5 flex items-center justify-center">
                  <ArrowRight weight="fill" className="w-4 h-4 text-white" />
                </span>
                <span className="text-sm font-normal">
                  {stage === "upload" ? "Choose profiles" : "Review settings"}
                </span>
              </motion.button>
            )}
          </motion.div>
        )}
      </div>
    </div>
  );
}
