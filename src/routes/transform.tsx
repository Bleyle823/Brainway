import { createFileRoute, Link, useNavigate, redirect } from "@tanstack/react-router";
import { z } from "zod";
import { useState, useEffect, useCallback, useRef, type ChangeEvent } from "react";
import { motion, AnimatePresence } from "motion/react";
import {
  ArrowLeft,
  ArrowRight,
  ArrowSquareOut,
  Sparkle,
  WarningCircle,
} from "@phosphor-icons/react";
import VideoUploader, { type VideoInfo } from "@/components/transform/VideoUploader";
import ProfileSelector, { type ProfileId } from "@/components/transform/ProfileSelector";
import TransformConfig, { type AllConfig } from "@/components/transform/TransformConfig";
import ProcessingPipeline from "@/components/transform/ProcessingPipeline";
import TransformResult from "@/components/transform/TransformResult";
import LanguageSelector from "@/components/LanguageSelector";
import { DEFAULT_LANGUAGE_CODE } from "@/lib/languages";
import { buildTransformPrompt } from "@/lib/transform-prompts";
import type { Act2Ratio } from "@/lib/runway-api";
import {
  DEMO_PRESET_CONFIG,
  DEMO_PROFILE_IDS,
  DEMO_SAMPLE_VIDEO_URL,
  DEMO_TRANSFORM_SEED,
} from "@/lib/transform-demo";
import {
  createUploadIntentFn,
  startTransformFn,
  startCalmPresenterFn,
  pollTaskFn,
  cancelTaskFn,
} from "@/lib/transform-fns";
import {
  fileToDataUri,
  mapProgressToStep,
  MAX_DATAURI_BYTES,
  POLL_INTERVAL_MS,
  TOTAL_PIPELINE_STEPS,
} from "@/lib/transform-helpers";

const transformSearchSchema = z.object({
  videoUrl: z.string().url().optional(),
  videoMode: z.enum(["aleph", "calmPresenter"]).optional(),
  tab: z.enum(["video", "image", "audio"]).optional(),
  imageMode: z.enum(["describe", "adapt", "img2img"]).optional(),
  audioMode: z.enum(["renarrate", "dub", "soundscape"]).optional(),
});

export const Route = createFileRoute("/transform")({
  validateSearch: transformSearchSchema,
  beforeLoad: ({ search }) => {
    if (search.tab === "image") {
      throw redirect({
        to: "/safe-images",
        search: search.imageMode ? { imageMode: search.imageMode } : {},
      });
    }
    if (search.tab === "audio") {
      throw redirect({
        to: "/safe-audio",
        search: search.audioMode ? { audioMode: search.audioMode } : {},
      });
    }
  },
  component: TransformPage,
  head: () => ({
    meta: [
      { title: "Transform Content — Brainwave" },
      {
        name: "description",
        content:
          "Transform videos with neurodivergent-safe accessibility features. Apply ADHD, autism, dyslexia, and sensory-safe adjustments automatically.",
      },
    ],
  }),
});

type Stage = "upload" | "profiles" | "configure" | "processing" | "result";
type VideoInputMode = "aleph" | "calmPresenter";

const WIZARD_STEPS: { key: Stage; label: string }[] = [
  { key: "upload", label: "Upload" },
  { key: "profiles", label: "Profiles" },
  { key: "configure", label: "Configure" },
];


function TransformPage() {
  const navigate = useNavigate();
  const { videoUrl, videoMode: videoModeSearch } = Route.useSearch();
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
  /** Set for the one-click demo (reproducible Aleph seed on HTTPS inputs). */
  const [transformSeed, setTransformSeed] = useState<number | undefined>(undefined);
  const [videoInputMode, setVideoInputMode] = useState<VideoInputMode>("aleph");

  /** Calm presenter (act_two) state */
  const [calmPresenterCharacterFile, setCalmPresenterCharacterFile] = useState<File | null>(null);
  const [calmPresenterCharacterUrl, setCalmPresenterCharacterUrl] = useState("");
  const [calmPresenterCharacterMode, setCalmPresenterCharacterMode] = useState<"file" | "url">("file");
  const [calmPresenterCharacterType, setCalmPresenterCharacterType] = useState<"image" | "video">("image");
  const [calmPresenterReferenceFile, setCalmPresenterReferenceFile] = useState<File | null>(null);
  const [calmPresenterReferenceUrl, setCalmPresenterReferenceUrl] = useState("");
  const [calmPresenterReferenceMode, setCalmPresenterReferenceMode] = useState<"file" | "url">("file");
  const [calmPresenterRatio, setCalmPresenterRatio] = useState<Act2Ratio>("1280:720");
  const [calmPresenterCharacterPreviewUrl, setCalmPresenterCharacterPreviewUrl] = useState<string | null>(null);
  const [calmPresenterReferencePreviewUrl, setCalmPresenterReferencePreviewUrl] = useState<string | null>(null);
  const calmPresenterCharacterFileInputRef = useRef<HTMLInputElement>(null);
  const calmPresenterReferenceFileInputRef = useRef<HTMLInputElement>(null);

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

  useEffect(() => {
    if (videoModeSearch) {
      setVideoInputMode(videoModeSearch);
    }
  }, [videoModeSearch]);

  // Handle deep-link from /create with generated video URL
  useEffect(() => {
    if (videoUrl && !video) {
      try {
        const url = new URL(videoUrl);
        if (url.protocol === "https:" || url.protocol === "http:") {
          setVideo({
            name: "Generated clip",
            externalUrl: videoUrl,
            type: "video/mp4",
            size: "Generated video",
          });
          setStage("profiles");
          // Clear search param to avoid refresh loops
          navigate({
            to: "/transform",
            search: {},
            replace: true,
          });
        }
      } catch (err) {
        console.warn("Invalid videoUrl in search params:", videoUrl);
      }
    }
  }, [videoUrl, video, navigate]);

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
    if (videoInputMode === "aleph" && !video) return;
    if (videoInputMode === "calmPresenter" && (!calmPresenterCharacterReady || !calmPresenterReferenceReady)) return;

    setTaskError(null);
    setOutputUrl(null);
    setProcessingStep(0);
    setStage("processing");

    try {
      if (videoInputMode === "aleph") {
        // Original Aleph flow
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
            ...(transformSeed != null ? { seed: transformSeed } : {}),
          },
        });

        setTaskId(newTaskId);
        setProcessingStep(2);
        scheduleNextPoll(newTaskId);
      } else {
        // Calm Presenter (Act-Two) flow
        let characterUri: string;
        let referenceVideoUri: string;

        // Handle character URI
        if (calmPresenterCharacterMode === "file" && calmPresenterCharacterFile) {
          if (calmPresenterCharacterFile.size <= MAX_DATAURI_BYTES) {
            setIsUploading(true);
            characterUri = await fileToDataUri(calmPresenterCharacterFile);
          } else {
            setIsUploading(true);
            const intent = await createUploadIntentFn({
              data: { filename: calmPresenterCharacterFile.name },
            });

            const form = new FormData();
            Object.entries(intent.fields).forEach(([k, v]) => form.append(k, v));
            form.append("file", calmPresenterCharacterFile);

            const uploadRes = await fetch(intent.uploadUrl, {
              method: "POST",
              body: form,
            });
            if (!uploadRes.ok) {
              throw new Error("Character file upload failed.");
            }

            characterUri = intent.runwayUri;
          }
        } else {
          characterUri = calmPresenterCharacterUrl.trim();
        }

        // Handle reference video URI
        if (calmPresenterReferenceMode === "file" && calmPresenterReferenceFile) {
          if (calmPresenterReferenceFile.size <= MAX_DATAURI_BYTES) {
            referenceVideoUri = await fileToDataUri(calmPresenterReferenceFile);
          } else {
            const intent = await createUploadIntentFn({
              data: { filename: calmPresenterReferenceFile.name },
            });

            const form = new FormData();
            Object.entries(intent.fields).forEach(([k, v]) => form.append(k, v));
            form.append("file", calmPresenterReferenceFile);

            const uploadRes = await fetch(intent.uploadUrl, {
              method: "POST",
              body: form,
            });
            if (!uploadRes.ok) {
              throw new Error("Reference video upload failed.");
            }

            referenceVideoUri = intent.runwayUri;
          }
        } else {
          referenceVideoUri = calmPresenterReferenceUrl.trim();
        }

        setIsUploading(false);
        setProcessingStep(1);

        // Kick off the act_two job server-side
        const { taskId: newTaskId } = await startCalmPresenterFn({
          data: {
            characterUri,
            characterType: calmPresenterCharacterType,
            referenceVideoUri,
            ratio: calmPresenterRatio,
            profiles: Array.from(selectedProfiles),
            config,
            targetLanguage,
          },
        });

        setTaskId(newTaskId);
        setProcessingStep(2);
        scheduleNextPoll(newTaskId);
      }
    } catch (err) {
      setIsUploading(false);
      const msg =
        err instanceof Error ? err.message : "Failed to start transform.";
      setTaskError(msg);
      setStage("configure");
    }
  }, [
    videoInputMode,
    video,
    calmPresenterCharacterReady,
    calmPresenterReferenceReady,
    calmPresenterCharacterMode,
    calmPresenterCharacterFile,
    calmPresenterCharacterUrl,
    calmPresenterCharacterType,
    calmPresenterReferenceMode,
    calmPresenterReferenceFile,
    calmPresenterReferenceUrl,
    calmPresenterRatio,
    selectedProfiles,
    config,
    targetLanguage,
    transformSeed,
    scheduleNextPoll,
  ]);
  const revokeCalmPresenterCharacterPreview = useCallback(() => {
    setCalmPresenterCharacterPreviewUrl((prev) => {
      if (prev) URL.revokeObjectURL(prev);
      return null;
    });
  }, []);

  const revokeCalmPresenterReferencePreview = useCallback(() => {
    setCalmPresenterReferencePreviewUrl((prev) => {
      if (prev) URL.revokeObjectURL(prev);
      return null;
    });
  }, []);

  const resetCalmPresenterFormState = useCallback(() => {
    revokeCalmPresenterCharacterPreview();
    revokeCalmPresenterReferencePreview();
    setVideoInputMode("aleph");
    setCalmPresenterCharacterFile(null);
    setCalmPresenterCharacterUrl("");
    setCalmPresenterCharacterMode("file");
    setCalmPresenterCharacterType("image");
    setCalmPresenterReferenceFile(null);
    setCalmPresenterReferenceUrl("");
    setCalmPresenterReferenceMode("file");
    setCalmPresenterRatio("1280:720");
  }, [revokeCalmPresenterCharacterPreview, revokeCalmPresenterReferencePreview]);

  const handleReset = useCallback(() => {
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
    setTransformSeed(undefined);
    resetCalmPresenterFormState();
    sssScore.current = Math.floor(Math.random() * 8) + 88;
  }, [taskId, resetCalmPresenterFormState]);

  const loadNeurodivergentDemo = useCallback(() => {
    setTaskError(null);
    setTransformSeed(DEMO_TRANSFORM_SEED);
    setVideo({
      name: "Runway sample clip (taxi)",
      externalUrl: DEMO_SAMPLE_VIDEO_URL,
    });
    setSelectedProfiles(new Set(DEMO_PROFILE_IDS));
    setConfig(DEMO_PRESET_CONFIG);
    setTargetLanguage(DEFAULT_LANGUAGE_CODE);
    setStage("configure");
  }, []);
  const handleVideoReady = useCallback((v: VideoInfo) => {
    setTransformSeed(undefined);
    setVideo(v);
  }, []);
  const handleCalmPresenterCharacterFileSelect = useCallback((e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const isImage = file.type.startsWith("image/");
    const isVideo = file.type.startsWith("video/");
    if (!isImage && !isVideo) {
      setTaskError("Please select an image or video file for the character.");
      return;
    }
    if (file.size > MAX_DATAURI_BYTES) {
      setTaskError("Character file must be under 12 MB.");
      return;
    }
    setCalmPresenterCharacterPreviewUrl((prev) => {
      if (prev) URL.revokeObjectURL(prev);
      return URL.createObjectURL(file);
    });
    setCalmPresenterCharacterFile(file);
    setCalmPresenterCharacterType(isImage ? "image" : "video");
    setTaskError(null);
  }, []);

  const handleCalmPresenterReferenceFileSelect = useCallback((e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith("video/")) {
      setTaskError("Please select a video file for the reference performance.");
      return;
    }
    if (file.size > MAX_DATAURI_BYTES) {
      setTaskError("Reference video must be under 12 MB.");
      return;
    }
    setCalmPresenterReferencePreviewUrl((prev) => {
      if (prev) URL.revokeObjectURL(prev);
      return URL.createObjectURL(file);
    });
    setCalmPresenterReferenceFile(file);
    setTaskError(null);
  }, []);

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

  const calmPresenterCharacterReady =
    calmPresenterCharacterMode === "file"
      ? calmPresenterCharacterFile !== null
      : /^https?:\/\//i.test(calmPresenterCharacterUrl.trim());

  const calmPresenterReferenceReady =
    calmPresenterReferenceMode === "file"
      ? calmPresenterReferenceFile !== null
      : /^https?:\/\//i.test(calmPresenterReferenceUrl.trim());

  const calmPresenterStep1Ready = calmPresenterCharacterReady && calmPresenterReferenceReady;

  const videoStep1Ready =
    videoInputMode === "aleph" ? video !== null : calmPresenterStep1Ready;

  const canAdvance =
    (stage === "upload" && videoStep1Ready) ||
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
      <nav className="w-full px-4 md:px-8 py-4 md:py-5 flex items-center justify-between">
        <Link to="/" className="flex items-center gap-2.5 group">
          <ArrowLeft weight="fill" className="w-4 h-4 text-neutral-500 group-hover:text-neutral-900 transition-colors" />
          <span className="text-xl font-normal text-neutral-900 tracking-tight">
            Brainwave
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
        <div className="mt-6 mb-8 flex flex-wrap gap-2 text-sm">
          <Link
            to="/safe-images"
            className="rounded-full border border-neutral-300 bg-white/70 px-4 py-2 text-neutral-700 hover:text-neutral-900"
          >
            Educator-safe images
          </Link>
          <Link
            to="/safe-audio"
            className="rounded-full border border-neutral-300 bg-white/70 px-4 py-2 text-neutral-700 hover:text-neutral-900"
          >
            Safe audio
          </Link>
        </div>

        <AnimatePresence>
          {isWizardStage && (
            <motion.div
              key="header-video"
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
                Upload a video built for general audiences. Select the accessibility profiles that match your
                learners. Brainwave applies every transformation automatically.
              </p>

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

        <>
        {/* Video mode - step content */}
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
          <div className="mb-6">
            <div className="flex rounded-full border border-neutral-300 bg-neutral-100 p-1 w-fit">
              <button
                type="button"
                onClick={() => setVideoInputMode("aleph")}
                className={`px-4 py-1.5 rounded-full text-sm transition-colors ${
                  videoInputMode === "aleph"
                    ? "bg-neutral-900 text-white"
                    : "text-neutral-600 hover:text-neutral-900"
                }`}
              >
                Re-edit my video (Aleph)
              </button>
              <button
                type="button"
                onClick={() => setVideoInputMode("calmPresenter")}
                className={`px-4 py-1.5 rounded-full text-sm transition-colors ${
                  videoInputMode === "calmPresenter"
                    ? "bg-neutral-900 text-white"
                    : "text-neutral-600 hover:text-neutral-900"
                }`}
              >
                Calm presenter (Act-Two)
              </button>
            </div>
          </div>
          
          {videoInputMode === "aleph" ? (
            <VideoUploader
              video={video}
              onVideoReady={handleVideoReady}
              onClear={() => {
                setTransformSeed(undefined);
                setVideo(null);
              }}
            />
          ) : (
            <div className="space-y-6">
              <p className="text-xs text-neutral-500">
                Upload a calm character (image or video) and your original lecture video. 
                Act-Two will transfer your lecture's gestures and speech onto the calm avatar.
              </p>
              
              {/* Character Input */}
              <div>
                <label className="text-xs uppercase tracking-[0.15em] text-neutral-500">
                  Character (calm avatar)
                </label>
                <div className="mt-2 flex gap-2">
                  <button
                    type="button"
                    onClick={() => setCalmPresenterCharacterMode("file")}
                    className={`px-3 py-1.5 text-sm rounded-lg border ${
                      calmPresenterCharacterMode === "file"
                        ? "border-neutral-900 bg-white"
                        : "border-neutral-300 bg-neutral-50"
                    }`}
                  >
                    Upload
                  </button>
                  <button
                    type="button"
                    onClick={() => setCalmPresenterCharacterMode("url")}
                    className={`px-3 py-1.5 text-sm rounded-lg border ${
                      calmPresenterCharacterMode === "url"
                        ? "border-neutral-900 bg-white"
                        : "border-neutral-300 bg-neutral-50"
                    }`}
                  >
                    URL
                  </button>
                </div>
                {calmPresenterCharacterMode === "file" ? (
                  <div className="mt-2">
                    <input
                      ref={calmPresenterCharacterFileInputRef}
                      type="file"
                      accept="image/*,video/*"
                      className="hidden"
                      onChange={handleCalmPresenterCharacterFileSelect}
                    />
                    <button
                      type="button"
                      onClick={() => calmPresenterCharacterFileInputRef.current?.click()}
                      className="w-full rounded-xl border-2 border-dashed border-neutral-300 bg-neutral-50 py-6 text-sm text-neutral-600 hover:border-neutral-400"
                    >
                      {calmPresenterCharacterFile 
                        ? calmPresenterCharacterFile.name 
                        : "Character image or video (max 12 MB)"}
                    </button>
                  </div>
                ) : (
                  <input
                    type="url"
                    value={calmPresenterCharacterUrl}
                    onChange={(e) => setCalmPresenterCharacterUrl(e.target.value)}
                    placeholder="https://example.com/character.mp4"
                    className="mt-2 w-full rounded-xl border border-neutral-300 bg-white px-4 py-3 text-sm"
                  />
                )}
                {(calmPresenterCharacterPreviewUrl || 
                  (calmPresenterCharacterMode === "url" && calmPresenterCharacterUrl.trim())) && (
                  <div className="mt-2 rounded-xl border border-neutral-200 overflow-hidden bg-neutral-100 max-h-40">
                    {calmPresenterCharacterType === "image" ? (
                      <img
                        src={
                          calmPresenterCharacterPreviewUrl ||
                          (calmPresenterCharacterMode === "url" ? calmPresenterCharacterUrl.trim() : "")
                        }
                        alt="Character preview"
                        className="w-full h-full object-contain max-h-40"
                      />
                    ) : (
                      <video
                        src={
                          calmPresenterCharacterPreviewUrl ||
                          (calmPresenterCharacterMode === "url" ? calmPresenterCharacterUrl.trim() : "")
                        }
                        className="w-full h-full object-contain max-h-40"
                        controls
                        muted
                      />
                    )}
                  </div>
                )}
              </div>

              {/* Reference Video Input */}
              <div>
                <label className="text-xs uppercase tracking-[0.15em] text-neutral-500">
                  Performance reference (your original lecture)
                </label>
                <div className="mt-2 flex gap-2">
                  <button
                    type="button"
                    onClick={() => setCalmPresenterReferenceMode("file")}
                    className={`px-3 py-1.5 text-sm rounded-lg border ${
                      calmPresenterReferenceMode === "file"
                        ? "border-neutral-900 bg-white"
                        : "border-neutral-300 bg-neutral-50"
                    }`}
                  >
                    Upload
                  </button>
                  <button
                    type="button"
                    onClick={() => setCalmPresenterReferenceMode("url")}
                    className={`px-3 py-1.5 text-sm rounded-lg border ${
                      calmPresenterReferenceMode === "url"
                        ? "border-neutral-900 bg-white"
                        : "border-neutral-300 bg-neutral-50"
                    }`}
                  >
                    URL
                  </button>
                </div>
                {calmPresenterReferenceMode === "file" ? (
                  <div className="mt-2">
                    <input
                      ref={calmPresenterReferenceFileInputRef}
                      type="file"
                      accept="video/*"
                      className="hidden"
                      onChange={handleCalmPresenterReferenceFileSelect}
                    />
                    <button
                      type="button"
                      onClick={() => calmPresenterReferenceFileInputRef.current?.click()}
                      className="w-full rounded-xl border-2 border-dashed border-neutral-300 bg-neutral-50 py-6 text-sm text-neutral-600 hover:border-neutral-400"
                    >
                      {calmPresenterReferenceFile 
                        ? calmPresenterReferenceFile.name 
                        : "Reference video (max 12 MB)"}
                    </button>
                  </div>
                ) : (
                  <input
                    type="url"
                    value={calmPresenterReferenceUrl}
                    onChange={(e) => setCalmPresenterReferenceUrl(e.target.value)}
                    placeholder="https://example.com/lecture.mp4"
                    className="mt-2 w-full rounded-xl border border-neutral-300 bg-white px-4 py-3 text-sm"
                  />
                )}
                {(calmPresenterReferencePreviewUrl || 
                  (calmPresenterReferenceMode === "url" && calmPresenterReferenceUrl.trim())) && (
                  <div className="mt-2 rounded-xl border border-neutral-200 overflow-hidden bg-neutral-100 max-h-40">
                    <video
                      src={
                        calmPresenterReferencePreviewUrl ||
                        (calmPresenterReferenceMode === "url" ? calmPresenterReferenceUrl.trim() : "")
                      }
                      className="w-full h-full object-contain max-h-40"
                      controls
                      muted
                    />
                  </div>
                )}
              </div>

              {/* Ratio Selection */}
              <div>
                <label className="text-xs uppercase tracking-[0.15em] text-neutral-500">
                  Output ratio
                </label>
                <select
                  value={calmPresenterRatio}
                  onChange={(e) => setCalmPresenterRatio(e.target.value as Act2Ratio)}
                  className="mt-2 w-full rounded-xl border border-neutral-300 bg-white px-4 py-3 text-sm"
                >
                  <option value="1280:720">16:9 Landscape (1280×720)</option>
                  <option value="720:1280">9:16 Portrait (720×1280)</option>
                  <option value="960:960">1:1 Square (960×960)</option>
                  <option value="1104:832">4:3 Classic (1104×832)</option>
                  <option value="832:1104">3:4 Portrait (832×1104)</option>
                </select>
              </div>
            </div>
          )}
          
          {videoInputMode === "aleph" && (
            <div className="mt-8 rounded-[1.25rem] border border-neutral-300 bg-neutral-50/90 p-5">
            <p className="text-xs uppercase tracking-[0.15em] text-neutral-500">
              Demonstration
            </p>
            <p className="mt-2 text-sm text-neutral-700 leading-relaxed">
              Load Runway&apos;s official sample MP4, pre-select sensory / autism / ADHD
              profiles, and skip to review. The job runs through{" "}
              <code className="text-xs bg-neutral-200/80 px-1 py-0.5 rounded">
                @runwayml/sdk
              </code>{" "}
              <code className="text-xs bg-neutral-200/80 px-1 py-0.5 rounded">
                videoToVideo.create
              </code>{" "}
              with the same reproducible seed used in playground examples.
            </p>
            <button
              type="button"
              onClick={loadNeurodivergentDemo}
              className="mt-4 flex items-center gap-2 rounded-full bg-neutral-800 text-white text-sm pl-3 pr-5 py-2 hover:bg-neutral-950 transition-colors"
            >
              <Sparkle className="w-4 h-4" weight="fill" />
              Try neurodivergent-safe demo
            </button>
            </div>
          )}
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
          {selectedProfiles.size > 0 && (
            <div className="mt-6 rounded-[1.25rem] border border-neutral-200 bg-white/60 p-4">
              <p className="text-xs uppercase tracking-[0.15em] text-neutral-500">
                Aleph prompt preview
              </p>
              <p className="mt-2 text-xs text-neutral-700 leading-relaxed">
                {buildTransformPrompt(
                  Array.from(selectedProfiles),
                  config,
                  targetLanguage,
                )}
              </p>
            </div>
          )}
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
        </>
      </div>
    </div>
  );
}
