import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
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
import ImageSafeResult from "@/components/transform/ImageSafeResult";
import LanguageSelector from "@/components/LanguageSelector";
import { DEFAULT_LANGUAGE_CODE } from "@/lib/languages";
import { buildTransformPrompt } from "@/lib/transform-prompts";
import { buildEducatorSafeImagePrompt } from "@/lib/educator-image-prompt";
import type { Gen4ImageRatio } from "@/lib/runway-api";
import {
  DEMO_PRESET_CONFIG,
  DEMO_PROFILE_IDS,
  DEMO_SAMPLE_VIDEO_URL,
  DEMO_TRANSFORM_SEED,
} from "@/lib/transform-demo";
import {
  createUploadIntentFn,
  startTransformFn,
  startEducatorImageFn,
  startCalmPresenterFn,
  startCalmReNarrateFn,
  startLocalizedLectureFn,
  startSensorySoundscapeFn,
  pollTaskFn,
  cancelTaskFn,
} from "@/lib/transform-fns";
import type { Act2Ratio } from "@/lib/runway-api";
import type { SoundscapeId } from "@/lib/safe-audio-prompts";

const transformSearchSchema = z.object({
  videoUrl: z.string().url().optional(),
  tab: z.enum(["video", "image", "audio"]).optional(),
  /** When tab=image, optional starting sub-mode */
  imageMode: z.enum(["describe", "adapt", "img2img"]).optional(),
  /** When tab=video, optional starting sub-mode */
  videoMode: z.enum(["aleph", "calmPresenter"]).optional(),
  /** When tab=audio, optional starting sub-mode */
  audioMode: z.enum(["renarrate", "dub", "soundscape"]).optional(),
});

const IMAGE_RATIO_OPTIONS: { value: Gen4ImageRatio; label: string }[] = [
  { value: "1920:1080", label: "16:9 (1920×1080)" },
  { value: "1080:1920", label: "9:16 (1080×1920)" },
  { value: "1280:720", label: "16:9 HD (1280×720)" },
  { value: "720:1280", label: "9:16 (720×1280)" },
  { value: "1024:1024", label: "1:1 Square (1024)" },
  { value: "1080:1080", label: "1:1 (1080)" },
];

/** Max image size for data-URI reference upload (adapt-from-image) */
const MAX_IMAGE_BYTES = 8 * 1024 * 1024;

export const Route = createFileRoute("/transform")({
  component: TransformPage,
  validateSearch: transformSearchSchema,
  head: () => ({
    meta: [
      { title: "Transform Content — Brainwave" },
      {
        name: "description",
        content:
          "Transform videos and generate images with neurodivergent-safe accessibility features. Apply ADHD, autism, dyslexia, and sensory-safe adjustments automatically.",
      },
    ],
  }),
});

type Stage = "upload" | "profiles" | "configure" | "processing" | "result";
type Mode = "video" | "image" | "audio";
type ImageInputMode = "describe" | "adapt" | "img2img";
type VideoInputMode = "aleph" | "calmPresenter";
type AudioInputMode = "renarrate" | "dub" | "soundscape";

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
  const navigate = useNavigate();
  const { videoUrl, tab, imageMode: imageModeSearch, videoMode: videoModeSearch, audioMode: audioModeSearch } = Route.useSearch();
  const [mode, setMode] = useState<Mode>("video");
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

  /** Video mode: gen4_aleph vs act_two */
  const [videoInputMode, setVideoInputMode] = useState<VideoInputMode>("aleph");
  /** Image mode: text-to-image vs adapt-from-reference */
  const [imageInputMode, setImageInputMode] = useState<ImageInputMode>("describe");
  /** Audio mode: re-narrate vs dub vs soundscape */
  const [audioInputMode, setAudioInputMode] = useState<AudioInputMode>("renarrate");
  const [imageDescribeText, setImageDescribeText] = useState("");
  const [imageAdaptNotes, setImageAdaptNotes] = useState("");
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imageUrlInput, setImageUrlInput] = useState("");
  const [imageRefMode, setImageRefMode] = useState<"file" | "url">("file");
  const [imageRatio, setImageRatio] = useState<Gen4ImageRatio>("1920:1080");
  /** Reference image URI shown next to output (set when generation starts). */
  const [imageResultReferenceUrl, setImageResultReferenceUrl] = useState<string | null>(null);
  const [imageOutputLabel, setImageOutputLabel] = useState("illustration");
  const imageFileInputRef = useRef<HTMLInputElement>(null);
  /** Object URL for adapt-mode file preview (revoke on replace / reset). */
  const [imageLocalPreviewUrl, setImageLocalPreviewUrl] = useState<string | null>(null);

  /** Image → image: transformation instructions (combined with accessibility rules). */
  const [imageI2IInstructions, setImageI2IInstructions] = useState("");
  const [imageI2ISecondaryEnabled, setImageI2ISecondaryEnabled] = useState(false);
  const [imageSecondaryFile, setImageSecondaryFile] = useState<File | null>(null);
  const [imageSecondaryUrl, setImageSecondaryUrl] = useState("");
  const [imageSecondaryRefMode, setImageSecondaryRefMode] = useState<"file" | "url">("file");
  const [imageSecondaryLocalPreviewUrl, setImageSecondaryLocalPreviewUrl] = useState<string | null>(
    null,
  );
  const imageSecondaryFileInputRef = useRef<HTMLInputElement>(null);

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

  /** Audio mode state */
  // Re-narration (speech-to-speech)
  const [audioReNarrateFile, setAudioReNarrateFile] = useState<File | null>(null);
  const [audioReNarrateUrl, setAudioReNarrateUrl] = useState("");
  const [audioReNarrateMode, setAudioReNarrateMode] = useState<"file" | "url">("file");
  const [audioReNarrateMediaType, setAudioReNarrateMediaType] = useState<"audio" | "video">("audio");
  const [audioReNarrateVoicePreset, setAudioReNarrateVoicePreset] = useState("");
  const audioReNarrateFileInputRef = useRef<HTMLInputElement>(null);

  // Localization (voice dubbing)
  const [audioDubbingFile, setAudioDubbingFile] = useState<File | null>(null);
  const [audioDubbingUrl, setAudioDubbingUrl] = useState("");
  const [audioDubbingMode, setAudioDubbingMode] = useState<"file" | "url">("file");
  const audioDubbingFileInputRef = useRef<HTMLInputElement>(null);

  // Soundscape (sound effects)
  const [soundscapeScene, setSoundscapeScene] = useState<SoundscapeId>("pinkNoiseRain");
  const [soundscapeDuration, setSoundscapeDuration] = useState(10);
  const [soundscapeLoop, setSoundscapeLoop] = useState(true);
  const [soundscapeCustomNotes, setSoundscapeCustomNotes] = useState("");

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
    if (tab === "image") setMode("image");
    if (tab === "video") setMode("video");
  }, [tab]);

  useEffect(() => {
    if (tab === "image" && imageModeSearch) {
      setImageInputMode(imageModeSearch);
    }
    if (tab === "video" && videoModeSearch) {
      setVideoInputMode(videoModeSearch);
    }
    if (tab === "audio" && audioModeSearch) {
      setAudioInputMode(audioModeSearch);
    }
  }, [tab, imageModeSearch, videoModeSearch, audioModeSearch]);

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

  const revokeImageLocalPreview = useCallback(() => {
    setImageLocalPreviewUrl((prev) => {
      if (prev) URL.revokeObjectURL(prev);
      return null;
    });
  }, []);

  const revokeImageSecondaryLocalPreview = useCallback(() => {
    setImageSecondaryLocalPreviewUrl((prev) => {
      if (prev) URL.revokeObjectURL(prev);
      return null;
    });
  }, []);

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

  const resetImageFormState = useCallback(() => {
    revokeImageLocalPreview();
    revokeImageSecondaryLocalPreview();
    setImageInputMode("describe");
    setImageDescribeText("");
    setImageAdaptNotes("");
    setImageFile(null);
    setImageUrlInput("");
    setImageRefMode("file");
    setImageRatio("1920:1080");
    setImageResultReferenceUrl(null);
    setImageOutputLabel("illustration");
    setImageI2IInstructions("");
    setImageI2ISecondaryEnabled(false);
    setImageSecondaryFile(null);
    setImageSecondaryUrl("");
    setImageSecondaryRefMode("file");
  }, [revokeImageLocalPreview, revokeImageSecondaryLocalPreview]);

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

  const resetAudioFormState = useCallback(() => {
    setAudioInputMode("renarrate");
    // Re-narration
    setAudioReNarrateFile(null);
    setAudioReNarrateUrl("");
    setAudioReNarrateMode("file");
    setAudioReNarrateMediaType("audio");
    setAudioReNarrateVoicePreset("");
    // Dubbing
    setAudioDubbingFile(null);
    setAudioDubbingUrl("");
    setAudioDubbingMode("file");
    // Soundscape
    setSoundscapeScene("pinkNoiseRain");
    setSoundscapeDuration(10);
    setSoundscapeLoop(true);
    setSoundscapeCustomNotes("");
  }, []);

  // -------------------------------------------------------------------------
  // Start safe image (gen4_image)
  // -------------------------------------------------------------------------
  const handleStartImageGenerate = useCallback(async () => {
    if (selectedProfiles.size === 0) {
      setTaskError("Choose at least one accessibility profile.");
      setStage("configure");
      return;
    }

    setTaskError(null);
    setOutputUrl(null);
    setProcessingStep(0);
    setImageResultReferenceUrl(null);
    setStage("processing");

    try {
      let referenceImages: Array<{ uri: string; tag?: string }> | undefined;
      let userPromptSegment = "";
      let promptKind: "new" | "adaptReference" | "imageToImage" = "new";

      if (imageInputMode === "describe") {
        userPromptSegment = imageDescribeText.trim();
        if (!userPromptSegment) {
          throw new Error("Describe what you want in the illustration.");
        }
        setImageOutputLabel(userPromptSegment.slice(0, 60) || "illustration");
      } else if (imageInputMode === "adapt") {
        promptKind = "adaptReference";
        userPromptSegment = imageAdaptNotes.trim();
        let uri: string;
        if (imageRefMode === "file") {
          if (!imageFile) {
            throw new Error("Upload a reference image or switch to image URL.");
          }
          if (imageFile.size > MAX_IMAGE_BYTES) {
            throw new Error("Reference image must be under 8 MB.");
          }
          uri = await fileToDataUri(imageFile);
          setImageOutputLabel(imageFile.name.replace(/\.[^.]+$/, "") || "illustration");
        } else {
          const trimmed = imageUrlInput.trim();
          if (!trimmed.match(/^https?:\/\//)) {
            throw new Error("Enter a valid image URL starting with https://");
          }
          uri = trimmed;
          setImageOutputLabel(trimmed.split("/").pop()?.split("?")[0] || "illustration");
        }
        referenceImages = [{ uri }];
        setImageResultReferenceUrl(uri);
      } else {
        promptKind = "imageToImage";
        userPromptSegment =
          imageI2IInstructions.trim() ||
          "Preserve subject matter; apply accessibility treatment only.";

        let primaryUri: string;
        if (imageRefMode === "file") {
          if (!imageFile) {
            throw new Error("Upload the primary image (@primary) or use an image URL.");
          }
          if (imageFile.size > MAX_IMAGE_BYTES) {
            throw new Error("Primary image must be under 8 MB.");
          }
          primaryUri = await fileToDataUri(imageFile);
          setImageOutputLabel(
            `i2i-${imageFile.name.replace(/\.[^.]+$/, "") || "primary"}`,
          );
        } else {
          const trimmed = imageUrlInput.trim();
          if (!trimmed.match(/^https?:\/\//)) {
            throw new Error("Enter a valid primary image URL starting with https://");
          }
          primaryUri = trimmed;
          setImageOutputLabel(
            `i2i-${trimmed.split("/").pop()?.split("?")[0] || "primary"}`,
          );
        }

        referenceImages = [{ uri: primaryUri, tag: "primary" }];
        setImageResultReferenceUrl(primaryUri);

        if (imageI2ISecondaryEnabled) {
          let secondaryUri: string;
          if (imageSecondaryRefMode === "file") {
            if (!imageSecondaryFile) {
              throw new Error("Add a secondary image file, or turn off the style reference.");
            }
            if (imageSecondaryFile.size > MAX_IMAGE_BYTES) {
              throw new Error("Secondary image must be under 8 MB.");
            }
            secondaryUri = await fileToDataUri(imageSecondaryFile);
          } else {
            const st = imageSecondaryUrl.trim();
            if (!st.match(/^https?:\/\//)) {
              throw new Error("Enter a valid secondary image URL starting with https://");
            }
            secondaryUri = st;
          }
          referenceImages.push({ uri: secondaryUri, tag: "secondary" });
        }
      }

      const { taskId: newTaskId } = await startEducatorImageFn({
        data: {
          profiles: Array.from(selectedProfiles),
          config,
          targetLanguage,
          userPromptSegment,
          promptKind,
          ratio: imageRatio,
          referenceImages,
        },
      });

      setTaskId(newTaskId);
      setProcessingStep(2);
      scheduleNextPoll(newTaskId);
    } catch (err) {
      const msg =
        err instanceof Error ? err.message : "Failed to start image generation.";
      setTaskError(msg);
      setStage("configure");
    }
  }, [
    imageInputMode,
    imageDescribeText,
    imageAdaptNotes,
    imageRefMode,
    imageFile,
    imageUrlInput,
    imageRatio,
    imageI2IInstructions,
    imageI2ISecondaryEnabled,
    imageSecondaryRefMode,
    imageSecondaryFile,
    imageSecondaryUrl,
    selectedProfiles,
    config,
    targetLanguage,
    scheduleNextPoll,
  ]);

  // -------------------------------------------------------------------------
  // Start safe audio generation
  // -------------------------------------------------------------------------
  const handleStartAudioGenerate = useCallback(async () => {
    if (selectedProfiles.size === 0) {
      setTaskError("Choose at least one accessibility profile.");
      setStage("configure");
      return;
    }

    setTaskError(null);
    setOutputUrl(null);
    setProcessingStep(0);
    setStage("processing");

    try {
      if (audioInputMode === "renarrate") {
        let mediaUri: string;
        if (audioReNarrateMode === "file" && audioReNarrateFile) {
          if (audioReNarrateFile.size <= MAX_DATAURI_BYTES) {
            setIsUploading(true);
            mediaUri = await fileToDataUri(audioReNarrateFile);
            setIsUploading(false);
          } else {
            setIsUploading(true);
            const intent = await createUploadIntentFn({
              data: { filename: audioReNarrateFile.name },
            });

            const form = new FormData();
            Object.entries(intent.fields).forEach(([k, v]) => form.append(k, v));
            form.append("file", audioReNarrateFile);

            const uploadRes = await fetch(intent.uploadUrl, {
              method: "POST",
              body: form,
            });
            if (!uploadRes.ok) {
              throw new Error("Audio upload failed.");
            }

            mediaUri = intent.runwayUri;
            setIsUploading(false);
          }
        } else {
          mediaUri = audioReNarrateUrl.trim();
        }

        setProcessingStep(1);

        const { taskId: newTaskId } = await startCalmReNarrateFn({
          data: {
            mediaUri,
            mediaType: audioReNarrateMediaType,
            profiles: Array.from(selectedProfiles),
            config,
            voicePresetOverride: audioReNarrateVoicePreset || undefined,
          },
        });

        setTaskId(newTaskId);
        setProcessingStep(2);
        scheduleNextPoll(newTaskId);
      } else if (audioInputMode === "dub") {
        let audioUri: string;
        if (audioDubbingMode === "file" && audioDubbingFile) {
          if (audioDubbingFile.size <= MAX_DATAURI_BYTES) {
            setIsUploading(true);
            audioUri = await fileToDataUri(audioDubbingFile);
            setIsUploading(false);
          } else {
            setIsUploading(true);
            const intent = await createUploadIntentFn({
              data: { filename: audioDubbingFile.name },
            });

            const form = new FormData();
            Object.entries(intent.fields).forEach(([k, v]) => form.append(k, v));
            form.append("file", audioDubbingFile);

            const uploadRes = await fetch(intent.uploadUrl, {
              method: "POST",
              body: form,
            });
            if (!uploadRes.ok) {
              throw new Error("Audio upload failed.");
            }

            audioUri = intent.runwayUri;
            setIsUploading(false);
          }
        } else {
          audioUri = audioDubbingUrl.trim();
        }

        setProcessingStep(1);

        const { taskId: newTaskId } = await startLocalizedLectureFn({
          data: {
            audioUri,
            targetLanguage,
            profiles: Array.from(selectedProfiles),
            config,
          },
        });

        setTaskId(newTaskId);
        setProcessingStep(2);
        scheduleNextPoll(newTaskId);
      } else {
        // Soundscape mode
        setProcessingStep(1);

        const { taskId: newTaskId } = await startSensorySoundscapeFn({
          data: {
            scene: soundscapeScene,
            durationSec: soundscapeDuration,
            loop: soundscapeLoop,
            customNotes: soundscapeCustomNotes || undefined,
            profiles: Array.from(selectedProfiles),
            config,
          },
        });

        setTaskId(newTaskId);
        setProcessingStep(2);
        scheduleNextPoll(newTaskId);
      }
    } catch (err) {
      setIsUploading(false);
      const msg =
        err instanceof Error ? err.message : "Failed to start audio generation.";
      setTaskError(msg);
      setStage("configure");
    }
  }, [
    audioInputMode,
    audioReNarrateMode,
    audioReNarrateFile,
    audioReNarrateUrl,
    audioReNarrateMediaType,
    audioReNarrateVoicePreset,
    audioDubbingMode,
    audioDubbingFile,
    audioDubbingUrl,
    soundscapeScene,
    soundscapeDuration,
    soundscapeLoop,
    soundscapeCustomNotes,
    selectedProfiles,
    config,
    targetLanguage,
    scheduleNextPoll,
  ]);

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
    setTransformSeed(undefined);
    resetImageFormState();
    resetCalmPresenterFormState();
    resetAudioFormState();
    sssScore.current = Math.floor(Math.random() * 8) + 88;
  }, [taskId, resetImageFormState, resetCalmPresenterFormState, resetAudioFormState]);

  const handleModeSwitch = useCallback(
    (newMode: Mode) => {
      if (newMode === mode) return;

      if (taskId) {
        cancelTaskFn({ data: { taskId } }).catch(() => {});
      }
      if (pollTimerRef.current) clearTimeout(pollTimerRef.current);

      setStage("upload");
      setVideo(null);
      resetImageFormState();
      resetCalmPresenterFormState();
      resetAudioFormState();
      setSelectedProfiles(new Set());
      setConfig({} as AllConfig);
      setProcessingStep(0);
      setTaskId(null);
      setOutputUrl(null);
      setTaskError(null);
      setIsUploading(false);
      setTransformSeed(undefined);
      setTargetLanguage(DEFAULT_LANGUAGE_CODE);
      sssScore.current = Math.floor(Math.random() * 8) + 88;

      setMode(newMode);
    },
    [mode, taskId, resetImageFormState, resetCalmPresenterFormState, resetAudioFormState],
  );

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

  const handleImageFileSelect = useCallback((e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      setTaskError("Please select an image file.");
      return;
    }
    if (file.size > MAX_IMAGE_BYTES) {
      setTaskError("Image must be under 8 MB.");
      return;
    }
    setImageLocalPreviewUrl((prev) => {
      if (prev) URL.revokeObjectURL(prev);
      return URL.createObjectURL(file);
    });
    setImageFile(file);
    setTaskError(null);
  }, []);

  const handleImageSecondaryFileSelect = useCallback((e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      setTaskError("Please select an image file for the secondary reference.");
      return;
    }
    if (file.size > MAX_IMAGE_BYTES) {
      setTaskError("Secondary image must be under 8 MB.");
      return;
    }
    setImageSecondaryLocalPreviewUrl((prev) => {
      if (prev) URL.revokeObjectURL(prev);
      return URL.createObjectURL(file);
    });
    setImageSecondaryFile(file);
    setTaskError(null);
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

  const handleAudioReNarrateFileSelect = useCallback((e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const isAudio = file.type.startsWith("audio/");
    const isVideo = file.type.startsWith("video/");
    if (!isAudio && !isVideo) {
      setTaskError("Please select an audio or video file.");
      return;
    }
    if (file.size > MAX_DATAURI_BYTES) {
      setTaskError("File must be under 12 MB.");
      return;
    }
    setAudioReNarrateFile(file);
    setAudioReNarrateMediaType(isAudio ? "audio" : "video");
    setTaskError(null);
  }, []);

  const handleAudioDubbingFileSelect = useCallback((e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith("audio/")) {
      setTaskError("Please select an audio file for dubbing.");
      return;
    }
    if (file.size > MAX_DATAURI_BYTES) {
      setTaskError("Audio file must be under 12 MB.");
      return;
    }
    setAudioDubbingFile(file);
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
  const primaryImageReady =
    imageRefMode === "file"
      ? imageFile !== null
      : /^https?:\/\//i.test(imageUrlInput.trim());
  const secondaryImageReady =
    !imageI2ISecondaryEnabled ||
    (imageSecondaryRefMode === "file"
      ? imageSecondaryFile !== null
      : /^https?:\/\//i.test(imageSecondaryUrl.trim()));
  const imageStep1Ready =
    imageInputMode === "describe"
      ? imageDescribeText.trim().length > 0
      : imageInputMode === "adapt"
        ? primaryImageReady
        : primaryImageReady && secondaryImageReady;
  
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
    videoInputMode === "aleph" 
      ? video !== null
      : calmPresenterStep1Ready;

  const audioReNarrateReady =
    audioReNarrateMode === "file"
      ? audioReNarrateFile !== null
      : /^https?:\/\//i.test(audioReNarrateUrl.trim());
      
  const audioDubbingReady =
    audioDubbingMode === "file"
      ? audioDubbingFile !== null
      : /^https?:\/\//i.test(audioDubbingUrl.trim());

  const audioStep1Ready =
    audioInputMode === "renarrate"
      ? audioReNarrateReady
      : audioInputMode === "dub"
        ? audioDubbingReady
        : true; // Soundscape doesn't need file uploads

  const canAdvance =
    mode === "video"
      ? (stage === "upload" && videoStep1Ready) ||
        (stage === "profiles" && selectedProfiles.size > 0) ||
        stage === "configure"
      : mode === "image"
        ? (stage === "upload" && imageStep1Ready) ||
          (stage === "profiles" && selectedProfiles.size > 0) ||
          stage === "configure"
        : mode === "audio"
          ? (stage === "upload" && audioStep1Ready) ||
            (stage === "profiles" && selectedProfiles.size > 0) ||
            stage === "configure"
          : false;

  const isWizardStage = wizardIdx !== -1;

  const processingLabel =
    mode === "image"
      ? taskId
        ? "Generating neurodivergent-safe illustration…"
        : "Starting image job…"
      : isUploading
        ? "Uploading video to Runway…"
        : taskId
          ? "Running agentic pipeline…"
          : "Starting transform…";

  let imagePromptPreview = "";
  let imagePromptPreviewError: string | null = null;
  if (mode === "image" && stage === "configure" && selectedProfiles.size > 0) {
    try {
      const segment =
        imageInputMode === "describe"
          ? imageDescribeText.trim()
          : imageInputMode === "adapt"
            ? imageAdaptNotes.trim()
            : imageI2IInstructions.trim() ||
              "Preserve subject matter; apply accessibility treatment only.";
      const kind =
        imageInputMode === "describe"
          ? "new"
          : imageInputMode === "adapt"
            ? "adaptReference"
            : "imageToImage";
      const previewHasSecond =
        imageInputMode === "img2img" &&
        imageI2ISecondaryEnabled &&
        (imageSecondaryRefMode === "file"
          ? imageSecondaryFile !== null
          : /^https?:\/\//i.test(imageSecondaryUrl.trim()));
      imagePromptPreview = buildEducatorSafeImagePrompt(
        Array.from(selectedProfiles),
        config,
        targetLanguage,
        segment,
        kind,
        previewHasSecond,
      );
    } catch (e) {
      imagePromptPreviewError =
        e instanceof Error ? e.message : "Prompt could not be built.";
    }
  }

  return (
    <div className="min-h-screen bg-neutral-200">
      {/* Navbar */}
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
        {/* Mode switcher */}
        <div className="mt-6 mb-8">
          <div className="bg-white/60 border border-neutral-300/60 rounded-full p-1 flex w-fit">
            <button
              onClick={() => handleModeSwitch("video")}
              className={`px-4 py-2 rounded-full text-sm font-medium transition-all ${
                mode === "video"
                  ? "bg-white text-neutral-900 shadow-sm"
                  : "text-neutral-600 hover:text-neutral-900"
              }`}
            >
              Sensory-safe video
            </button>
            <button
              onClick={() => handleModeSwitch("image")}
              className={`px-4 py-2 rounded-full text-sm font-medium transition-all ${
                mode === "image"
                  ? "bg-white text-neutral-900 shadow-sm"
                  : "text-neutral-600 hover:text-neutral-900"
              }`}
            >
              Educator-safe images
            </button>
            <button
              onClick={() => handleModeSwitch("audio")}
              className={`px-4 py-2 rounded-full text-sm font-medium transition-all ${
                mode === "audio"
                  ? "bg-white text-neutral-900 shadow-sm"
                  : "text-neutral-600 hover:text-neutral-900"
              }`}
            >
              Safe audio
            </button>
          </div>
        </div>

        {/* Page header — wizard stages (video or image) */}
        <AnimatePresence>
          {isWizardStage && (
            <motion.div
              key={`header-${mode}`}
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.4 }}
              className="mt-4 mb-10"
            >
              {mode === "video" ? (
                <>
                  <span className="text-xs uppercase tracking-[0.2em] text-neutral-500">
                    Video Transformer
                  </span>
                  <h1 className="mt-3 text-3xl md:text-5xl font-normal text-neutral-900 leading-[1.08] tracking-tight">
                    Make any video<br />neurodivergent-safe.
                  </h1>
                  <p className="mt-4 text-sm md:text-base text-neutral-600 leading-relaxed max-w-lg">
                    Upload a video built for general audiences. Select the
                    accessibility profiles that match your learners. Brainwave
                    applies every transformation automatically.
                  </p>
                </>
              ) : (
                <>
                  <span className="text-xs uppercase tracking-[0.2em] text-neutral-500">
                    Safe image studio
                  </span>
                  <h1 className="mt-3 text-3xl md:text-5xl font-normal text-neutral-900 leading-[1.08] tracking-tight">
                    Text or reference → neurodivergent-safe art.
                  </h1>
                  <p className="mt-4 text-sm md:text-base text-neutral-600 leading-relaxed max-w-lg">
                    Generate a new calm illustration from a description, or upload an existing image
                    to adapt it with the same predefined accessibility rules (ADHD, autism, dyslexia,
                    sensory) used for video.
                  </p>
                </>
              )}

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

        {/* Content based on mode */}
        {mode === "video" ? (
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
        ) : mode === "image" ? (
          <>
            <AnimatePresence mode="wait">
              {stage === "upload" && (
                <motion.div
                  key="img-upload"
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -20 }}
                  transition={{ duration: 0.25 }}
                  className="space-y-6"
                >
                  <div className="mb-5">
                    <p className="text-xs uppercase tracking-[0.15em] text-neutral-500 mb-1">
                      Step 1
                    </p>
                    <h2 className="text-xl font-normal text-neutral-900">Describe, adapt, or transform</h2>
                    <p className="text-sm text-neutral-600 mt-1">
                      Text-to-image, single-reference adapt, or image-to-image with optional @secondary style
                      hints—all use the same neurodivergent-safe rules.
                    </p>
                  </div>
                  <div className="flex flex-wrap gap-1 rounded-full border border-neutral-300 bg-neutral-100 p-1 w-fit max-w-full">
                    <button
                      type="button"
                      onClick={() => setImageInputMode("describe")}
                      className={`px-3 sm:px-4 py-1.5 rounded-full text-sm transition-colors ${
                        imageInputMode === "describe"
                          ? "bg-neutral-900 text-white"
                          : "text-neutral-600 hover:text-neutral-900"
                      }`}
                    >
                      From description
                    </button>
                    <button
                      type="button"
                      onClick={() => setImageInputMode("adapt")}
                      className={`px-3 sm:px-4 py-1.5 rounded-full text-sm transition-colors ${
                        imageInputMode === "adapt"
                          ? "bg-neutral-900 text-white"
                          : "text-neutral-600 hover:text-neutral-900"
                      }`}
                    >
                      Adapt image
                    </button>
                    <button
                      type="button"
                      onClick={() => setImageInputMode("img2img")}
                      className={`px-3 sm:px-4 py-1.5 rounded-full text-sm transition-colors ${
                        imageInputMode === "img2img"
                          ? "bg-neutral-900 text-white"
                          : "text-neutral-600 hover:text-neutral-900"
                      }`}
                    >
                      Image → image
                    </button>
                  </div>
                  {imageInputMode === "describe" ? (
                    <div>
                      <label className="text-xs uppercase tracking-[0.15em] text-neutral-500">
                        What should the illustration show?
                      </label>
                      <textarea
                        value={imageDescribeText}
                        onChange={(e) => setImageDescribeText(e.target.value)}
                        rows={5}
                        placeholder="e.g. A simple diagram of the water cycle with clear labels…"
                        className="mt-2 w-full rounded-xl border border-neutral-300 bg-white px-4 py-3 text-sm text-neutral-900 placeholder:text-neutral-400 focus:outline-none focus:ring-2 focus:ring-neutral-900"
                      />
                    </div>
                  ) : imageInputMode === "adapt" ? (
                    <div className="space-y-4">
                      <p className="text-xs text-neutral-500">
                        One reference image; optional notes. Best when you want a calmer remake of the same idea.
                      </p>
                      <div className="flex gap-2">
                        <button
                          type="button"
                          onClick={() => setImageRefMode("file")}
                          className={`px-3 py-1.5 text-sm rounded-lg border ${
                            imageRefMode === "file"
                              ? "border-neutral-900 bg-white"
                              : "border-neutral-300 bg-neutral-50"
                          }`}
                        >
                          Upload file
                        </button>
                        <button
                          type="button"
                          onClick={() => setImageRefMode("url")}
                          className={`px-3 py-1.5 text-sm rounded-lg border ${
                            imageRefMode === "url"
                              ? "border-neutral-900 bg-white"
                              : "border-neutral-300 bg-neutral-50"
                          }`}
                        >
                          Image URL
                        </button>
                      </div>
                      {imageRefMode === "file" ? (
                        <div>
                          <input
                            ref={imageFileInputRef}
                            type="file"
                            accept="image/*"
                            className="hidden"
                            onChange={handleImageFileSelect}
                          />
                          <button
                            type="button"
                            onClick={() => imageFileInputRef.current?.click()}
                            className="w-full rounded-xl border-2 border-dashed border-neutral-300 bg-neutral-50 py-8 text-sm text-neutral-600 hover:border-neutral-400"
                          >
                            {imageFile ? imageFile.name : "Click to choose an image (max 8 MB)"}
                          </button>
                        </div>
                      ) : (
                        <input
                          type="url"
                          value={imageUrlInput}
                          onChange={(e) => setImageUrlInput(e.target.value)}
                          placeholder="https://…"
                          className="w-full rounded-xl border border-neutral-300 bg-white px-4 py-3 text-sm"
                        />
                      )}
                      {(imageLocalPreviewUrl || (imageRefMode === "url" && imageUrlInput.trim())) && (
                        <div className="rounded-xl border border-neutral-200 overflow-hidden bg-neutral-100 max-h-48">
                          <img
                            src={
                              imageLocalPreviewUrl ||
                              (imageRefMode === "url" ? imageUrlInput.trim() : "")
                            }
                            alt="Reference preview"
                            className="w-full h-full object-contain max-h-48"
                          />
                        </div>
                      )}
                      <div>
                        <label className="text-xs uppercase tracking-[0.15em] text-neutral-500">
                          Optional notes (e.g. keep the diagram, soften colors)
                        </label>
                        <textarea
                          value={imageAdaptNotes}
                          onChange={(e) => setImageAdaptNotes(e.target.value)}
                          rows={3}
                          className="mt-2 w-full rounded-xl border border-neutral-300 bg-white px-4 py-3 text-sm"
                        />
                      </div>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      <p className="text-xs text-neutral-500">
                        <strong>@primary</strong> is the image to transform. Optionally add <strong>@secondary</strong>{" "}
                        for mild palette or layout hints (not copied literally).
                      </p>
                      <div>
                        <label className="text-xs uppercase tracking-[0.15em] text-neutral-500">
                          Primary (@primary)
                        </label>
                        <div className="mt-2 flex gap-2">
                          <button
                            type="button"
                            onClick={() => setImageRefMode("file")}
                            className={`px-3 py-1.5 text-sm rounded-lg border ${
                              imageRefMode === "file"
                                ? "border-neutral-900 bg-white"
                                : "border-neutral-300 bg-neutral-50"
                            }`}
                          >
                            Upload
                          </button>
                          <button
                            type="button"
                            onClick={() => setImageRefMode("url")}
                            className={`px-3 py-1.5 text-sm rounded-lg border ${
                              imageRefMode === "url"
                                ? "border-neutral-900 bg-white"
                                : "border-neutral-300 bg-neutral-50"
                            }`}
                          >
                            URL
                          </button>
                        </div>
                        {imageRefMode === "file" ? (
                          <div className="mt-2">
                            <input
                              ref={imageFileInputRef}
                              type="file"
                              accept="image/*"
                              className="hidden"
                              onChange={handleImageFileSelect}
                            />
                            <button
                              type="button"
                              onClick={() => imageFileInputRef.current?.click()}
                              className="w-full rounded-xl border-2 border-dashed border-neutral-300 bg-neutral-50 py-6 text-sm text-neutral-600 hover:border-neutral-400"
                            >
                              {imageFile ? imageFile.name : "Primary image (max 8 MB)"}
                            </button>
                          </div>
                        ) : (
                          <input
                            type="url"
                            value={imageUrlInput}
                            onChange={(e) => setImageUrlInput(e.target.value)}
                            placeholder="https://…"
                            className="mt-2 w-full rounded-xl border border-neutral-300 bg-white px-4 py-3 text-sm"
                          />
                        )}
                        {(imageLocalPreviewUrl || (imageRefMode === "url" && imageUrlInput.trim())) && (
                          <div className="mt-2 rounded-xl border border-neutral-200 overflow-hidden bg-neutral-100 max-h-40">
                            <img
                              src={
                                imageLocalPreviewUrl ||
                                (imageRefMode === "url" ? imageUrlInput.trim() : "")
                              }
                              alt="Primary preview"
                              className="w-full h-full object-contain max-h-40"
                            />
                          </div>
                        )}
                      </div>

                      <label className="flex items-center gap-2 cursor-pointer text-sm text-neutral-800">
                        <input
                          type="checkbox"
                          checked={imageI2ISecondaryEnabled}
                          onChange={(e) => {
                            setImageI2ISecondaryEnabled(e.target.checked);
                            if (!e.target.checked) {
                              revokeImageSecondaryLocalPreview();
                              setImageSecondaryFile(null);
                              setImageSecondaryUrl("");
                            }
                          }}
                          className="rounded border-neutral-400"
                        />
                        Add optional style reference (@secondary)
                      </label>

                      {imageI2ISecondaryEnabled && (
                        <div className="pl-0 sm:pl-3 border-l-2 border-neutral-200 space-y-2">
                          <div className="flex gap-2">
                            <button
                              type="button"
                              onClick={() => setImageSecondaryRefMode("file")}
                              className={`px-3 py-1.5 text-sm rounded-lg border ${
                                imageSecondaryRefMode === "file"
                                  ? "border-neutral-900 bg-white"
                                  : "border-neutral-300 bg-neutral-50"
                              }`}
                            >
                              Upload
                            </button>
                            <button
                              type="button"
                              onClick={() => setImageSecondaryRefMode("url")}
                              className={`px-3 py-1.5 text-sm rounded-lg border ${
                                imageSecondaryRefMode === "url"
                                  ? "border-neutral-900 bg-white"
                                  : "border-neutral-300 bg-neutral-50"
                              }`}
                            >
                              URL
                            </button>
                          </div>
                          {imageSecondaryRefMode === "file" ? (
                            <div>
                              <input
                                ref={imageSecondaryFileInputRef}
                                type="file"
                                accept="image/*"
                                className="hidden"
                                onChange={handleImageSecondaryFileSelect}
                              />
                              <button
                                type="button"
                                onClick={() => imageSecondaryFileInputRef.current?.click()}
                                className="w-full rounded-xl border-2 border-dashed border-neutral-300 bg-neutral-50 py-6 text-sm text-neutral-600 hover:border-neutral-400"
                              >
                                {imageSecondaryFile
                                  ? imageSecondaryFile.name
                                  : "Secondary image (max 8 MB)"}
                              </button>
                            </div>
                          ) : (
                            <input
                              type="url"
                              value={imageSecondaryUrl}
                              onChange={(e) => setImageSecondaryUrl(e.target.value)}
                              placeholder="https://…"
                              className="w-full rounded-xl border border-neutral-300 bg-white px-4 py-3 text-sm"
                            />
                          )}
                          {(imageSecondaryLocalPreviewUrl ||
                            (imageSecondaryRefMode === "url" && imageSecondaryUrl.trim())) && (
                            <div className="rounded-xl border border-neutral-200 overflow-hidden bg-neutral-100 max-h-36">
                              <img
                                src={
                                  imageSecondaryLocalPreviewUrl ||
                                  (imageSecondaryRefMode === "url" ? imageSecondaryUrl.trim() : "")
                                }
                                alt="Secondary preview"
                                className="w-full h-full object-contain max-h-36"
                              />
                            </div>
                          )}
                        </div>
                      )}

                      <div>
                        <label className="text-xs uppercase tracking-[0.15em] text-neutral-500">
                          What to change (optional — defaults to accessibility pass only)
                        </label>
                        <textarea
                          value={imageI2IInstructions}
                          onChange={(e) => setImageI2IInstructions(e.target.value)}
                          rows={3}
                          placeholder="e.g. Keep the same layout but reduce saturation and simplify the background…"
                          className="mt-2 w-full rounded-xl border border-neutral-300 bg-white px-4 py-3 text-sm"
                        />
                      </div>
                    </div>
                  )}
                </motion.div>
              )}

              {stage === "profiles" && (
                <motion.div
                  key="img-profiles"
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -20 }}
                  transition={{ duration: 0.25 }}
                >
                  <div className="mb-5">
                    <p className="text-xs uppercase tracking-[0.15em] text-neutral-500 mb-1">
                      Step 2
                    </p>
                    <h2 className="text-xl font-normal text-neutral-900">Choose accessibility profiles</h2>
                    <p className="text-sm text-neutral-600 mt-1">
                      Rules are combined into one gen4_image prompt automatically.
                    </p>
                  </div>
                  <ProfileSelector selected={selectedProfiles} onToggle={toggleProfile} />
                </motion.div>
              )}

              {stage === "configure" && (
                <motion.div
                  key="img-configure"
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -20 }}
                  transition={{ duration: 0.25 }}
                >
                  <div className="mb-5">
                    <p className="text-xs uppercase tracking-[0.15em] text-neutral-500 mb-1">
                      Step 3
                    </p>
                    <h2 className="text-xl font-normal text-neutral-900">Fine-tune and export size</h2>
                    <p className="text-sm text-neutral-600 mt-1">
                      Adjust sliders to match your learners; pick an aspect ratio for the output file.
                    </p>
                  </div>
                  <TransformConfig
                    selectedProfiles={selectedProfiles}
                    config={config}
                    onChange={updateConfig}
                  />
                  <div className="mt-6">
                    <label className="text-xs uppercase tracking-[0.15em] text-neutral-500">
                      Output aspect ratio
                    </label>
                    <select
                      value={imageRatio}
                      onChange={(e) => setImageRatio(e.target.value as Gen4ImageRatio)}
                      className="mt-2 w-full rounded-xl border border-neutral-300 bg-white px-4 py-3 text-sm"
                    >
                      {IMAGE_RATIO_OPTIONS.map((o) => (
                        <option key={o.value} value={o.value}>
                          {o.label}
                        </option>
                      ))}
                    </select>
                  </div>
                  {selectedProfiles.size > 0 && (
                    <div className="mt-6 rounded-[1.25rem] border border-neutral-200 bg-white/60 p-4">
                      <p className="text-xs uppercase tracking-[0.15em] text-neutral-500">
                        gen4_image prompt preview
                      </p>
                      {imagePromptPreviewError ? (
                        <p className="mt-2 text-xs text-red-600">{imagePromptPreviewError}</p>
                      ) : (
                        <p className="mt-2 text-xs text-neutral-700 leading-relaxed break-words">
                          {imagePromptPreview}
                        </p>
                      )}
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
                      label="Text language in image"
                    />
                    <p className="mt-2 text-xs text-neutral-500 max-w-sm">
                      Any labels or captions in the illustration use this language.
                    </p>
                  </div>
                </motion.div>
              )}

              {stage === "processing" && (
                <motion.div
                  key="img-processing"
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  transition={{ duration: 0.3 }}
                >
                  <div className="mb-6 mt-4">
                    <span className="text-xs uppercase tracking-[0.2em] text-neutral-500">
                      Generating
                    </span>
                    <h2 className="mt-3 text-3xl md:text-4xl font-normal text-neutral-900 leading-[1.1] tracking-tight">
                      {processingLabel}
                    </h2>
                    <p className="mt-3 text-sm text-neutral-600 leading-relaxed max-w-md">
                      Runway gen4_image is rendering your illustration. This may take a minute or two.
                    </p>
                    {taskId && (
                      <p className="mt-2 text-xs text-neutral-500 font-mono">Task: {taskId}</p>
                    )}
                  </div>
                </motion.div>
              )}

              {stage === "result" && (
                <motion.div
                  key="img-result"
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.35 }}
                  className="mt-4"
                >
                  <div className="rounded-[1.5rem] bg-neutral-100/95 backdrop-blur-sm border border-neutral-200 p-6 md:p-8">
                    <ImageSafeResult
                      label={imageOutputLabel}
                      originalPreviewUrl={imageResultReferenceUrl}
                      outputUrl={outputUrl}
                      selectedProfiles={selectedProfiles}
                      onReset={handleReset}
                    />
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            {isWizardStage && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.1 }}
                className="mt-8 flex items-center justify-between"
              >
                {wizardIdx > 0 ? (
                  <button
                    type="button"
                    onClick={() => setStage(WIZARD_STEPS[wizardIdx - 1].key as Stage)}
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
                    type="button"
                    whileHover={{ scale: canAdvance ? 1.02 : 1 }}
                    whileTap={{ scale: canAdvance ? 0.98 : 1 }}
                    onClick={handleStartImageGenerate}
                    disabled={
                      !canAdvance ||
                      !!imagePromptPreviewError ||
                      selectedProfiles.size === 0
                    }
                    className="flex items-center bg-neutral-900 text-white rounded-full pl-2 pr-6 py-2 gap-3 hover:bg-neutral-950 transition-colors disabled:opacity-35 disabled:cursor-not-allowed"
                  >
                    <span className="bg-white/15 rounded-full p-1.5 flex items-center justify-center">
                      <ArrowSquareOut weight="fill" className="w-4 h-4 text-white" />
                    </span>
                    <span className="text-sm font-normal">Generate safe image</span>
                  </motion.button>
                ) : (
                  <motion.button
                    type="button"
                    whileHover={{ scale: canAdvance ? 1.02 : 1 }}
                    whileTap={{ scale: canAdvance ? 0.98 : 1 }}
                    onClick={() => setStage(WIZARD_STEPS[wizardIdx + 1].key as Stage)}
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
        ) : (
          <>
            {/* Audio mode - step content */}
            <AnimatePresence mode="wait">
              {stage === "upload" && (
                <motion.div
                  key="audio-upload"
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -20 }}
                  transition={{ duration: 0.25 }}
                  className="space-y-6"
                >
                  <div className="mb-5">
                    <p className="text-xs uppercase tracking-[0.15em] text-neutral-500 mb-1">
                      Step 1
                    </p>
                    <h2 className="text-xl font-normal text-neutral-900">Safe audio processing</h2>
                    <p className="text-sm text-neutral-600 mt-1">
                      Calm re-narration, localization, or sensory-safe soundscapes for neurodivergent learners.
                    </p>
                  </div>
                  <div className="flex flex-wrap gap-1 rounded-full border border-neutral-300 bg-neutral-100 p-1 w-fit max-w-full">
                    <button
                      type="button"
                      onClick={() => setAudioInputMode("renarrate")}
                      className={`px-3 sm:px-4 py-1.5 rounded-full text-sm transition-colors ${
                        audioInputMode === "renarrate"
                          ? "bg-neutral-900 text-white"
                          : "text-neutral-600 hover:text-neutral-900"
                      }`}
                    >
                      Calm re-narration
                    </button>
                    <button
                      type="button"
                      onClick={() => setAudioInputMode("dub")}
                      className={`px-3 sm:px-4 py-1.5 rounded-full text-sm transition-colors ${
                        audioInputMode === "dub"
                          ? "bg-neutral-900 text-white"
                          : "text-neutral-600 hover:text-neutral-900"
                      }`}
                    >
                      Localize lecture
                    </button>
                    <button
                      type="button"
                      onClick={() => setAudioInputMode("soundscape")}
                      className={`px-3 sm:px-4 py-1.5 rounded-full text-sm transition-colors ${
                        audioInputMode === "soundscape"
                          ? "bg-neutral-900 text-white"
                          : "text-neutral-600 hover:text-neutral-900"
                      }`}
                    >
                      Sensory soundscape
                    </button>
                  </div>
                  
                  {audioInputMode === "renarrate" ? (
                    <div className="space-y-4">
                      <p className="text-xs text-neutral-500">
                        Re-voice audio or video content with a calm, consistent narrator preset.
                      </p>
                      <div className="flex gap-2">
                        <button
                          type="button"
                          onClick={() => setAudioReNarrateMode("file")}
                          className={`px-3 py-1.5 text-sm rounded-lg border ${
                            audioReNarrateMode === "file"
                              ? "border-neutral-900 bg-white"
                              : "border-neutral-300 bg-neutral-50"
                          }`}
                        >
                          Upload file
                        </button>
                        <button
                          type="button"
                          onClick={() => setAudioReNarrateMode("url")}
                          className={`px-3 py-1.5 text-sm rounded-lg border ${
                            audioReNarrateMode === "url"
                              ? "border-neutral-900 bg-white"
                              : "border-neutral-300 bg-neutral-50"
                          }`}
                        >
                          URL
                        </button>
                      </div>
                      {audioReNarrateMode === "file" ? (
                        <div>
                          <input
                            ref={audioReNarrateFileInputRef}
                            type="file"
                            accept="audio/*,video/*"
                            className="hidden"
                            onChange={handleAudioReNarrateFileSelect}
                          />
                          <button
                            type="button"
                            onClick={() => audioReNarrateFileInputRef.current?.click()}
                            className="w-full rounded-xl border-2 border-dashed border-neutral-300 bg-neutral-50 py-8 text-sm text-neutral-600 hover:border-neutral-400"
                          >
                            {audioReNarrateFile 
                              ? audioReNarrateFile.name 
                              : "Audio or video file (max 12 MB)"}
                          </button>
                        </div>
                      ) : (
                        <input
                          type="url"
                          value={audioReNarrateUrl}
                          onChange={(e) => setAudioReNarrateUrl(e.target.value)}
                          placeholder="https://example.com/audio.mp3"
                          className="w-full rounded-xl border border-neutral-300 bg-white px-4 py-3 text-sm"
                        />
                      )}
                      <div>
                        <label className="text-xs uppercase tracking-[0.15em] text-neutral-500">
                          Voice preset (optional override)
                        </label>
                        <select
                          value={audioReNarrateVoicePreset}
                          onChange={(e) => setAudioReNarrateVoicePreset(e.target.value)}
                          className="mt-2 w-full rounded-xl border border-neutral-300 bg-white px-4 py-3 text-sm"
                        >
                          <option value="">Auto-select based on profiles</option>
                          <option value="Maggie">Maggie (softest)</option>
                          <option value="Noah">Noah (steady mid)</option>
                          <option value="Charlotte">Charlotte (gentle)</option>
                        </select>
                      </div>
                    </div>
                  ) : audioInputMode === "dub" ? (
                    <div className="space-y-4">
                      <p className="text-xs text-neutral-500">
                        Translate audio to the learner's preferred language while preserving voice characteristics.
                      </p>
                      <div className="flex gap-2">
                        <button
                          type="button"
                          onClick={() => setAudioDubbingMode("file")}
                          className={`px-3 py-1.5 text-sm rounded-lg border ${
                            audioDubbingMode === "file"
                              ? "border-neutral-900 bg-white"
                              : "border-neutral-300 bg-neutral-50"
                          }`}
                        >
                          Upload file
                        </button>
                        <button
                          type="button"
                          onClick={() => setAudioDubbingMode("url")}
                          className={`px-3 py-1.5 text-sm rounded-lg border ${
                            audioDubbingMode === "url"
                              ? "border-neutral-900 bg-white"
                              : "border-neutral-300 bg-neutral-50"
                          }`}
                        >
                          URL
                        </button>
                      </div>
                      {audioDubbingMode === "file" ? (
                        <div>
                          <input
                            ref={audioDubbingFileInputRef}
                            type="file"
                            accept="audio/*"
                            className="hidden"
                            onChange={handleAudioDubbingFileSelect}
                          />
                          <button
                            type="button"
                            onClick={() => audioDubbingFileInputRef.current?.click()}
                            className="w-full rounded-xl border-2 border-dashed border-neutral-300 bg-neutral-50 py-8 text-sm text-neutral-600 hover:border-neutral-400"
                          >
                            {audioDubbingFile 
                              ? audioDubbingFile.name 
                              : "Audio file (max 12 MB)"}
                          </button>
                        </div>
                      ) : (
                        <input
                          type="url"
                          value={audioDubbingUrl}
                          onChange={(e) => setAudioDubbingUrl(e.target.value)}
                          placeholder="https://example.com/lecture.mp3"
                          className="w-full rounded-xl border border-neutral-300 bg-white px-4 py-3 text-sm"
                        />
                      )}
                    </div>
                  ) : (
                    <div className="space-y-4">
                      <p className="text-xs text-neutral-500">
                        Generate calming background sounds optimized for neurodivergent learners.
                      </p>
                      <div>
                        <label className="text-xs uppercase tracking-[0.15em] text-neutral-500">
                          Scene type
                        </label>
                        <div className="mt-2 grid grid-cols-2 sm:grid-cols-3 gap-2">
                          {[
                            { id: "pinkNoiseRain" as const, label: "Pink noise rain" },
                            { id: "ocean" as const, label: "Ocean waves" },
                            { id: "forest" as const, label: "Forest ambience" },
                            { id: "studyRoom" as const, label: "Study room" },
                            { id: "whiteNoise" as const, label: "White noise" },
                            { id: "custom" as const, label: "Custom" },
                          ].map((scene) => (
                            <button
                              key={scene.id}
                              type="button"
                              onClick={() => setSoundscapeScene(scene.id)}
                              className={`px-3 py-2 text-sm rounded-lg border transition-colors ${
                                soundscapeScene === scene.id
                                  ? "border-neutral-900 bg-neutral-900 text-white"
                                  : "border-neutral-300 bg-white hover:border-neutral-400"
                              }`}
                            >
                              {scene.label}
                            </button>
                          ))}
                        </div>
                      </div>
                      {soundscapeScene === "custom" && (
                        <div>
                          <label className="text-xs uppercase tracking-[0.15em] text-neutral-500">
                            Custom scene description
                          </label>
                          <textarea
                            value={soundscapeCustomNotes}
                            onChange={(e) => setSoundscapeCustomNotes(e.target.value)}
                            rows={3}
                            placeholder="e.g. Gentle wind chimes with soft nature sounds..."
                            className="mt-2 w-full rounded-xl border border-neutral-300 bg-white px-4 py-3 text-sm"
                          />
                        </div>
                      )}
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <label className="text-xs uppercase tracking-[0.15em] text-neutral-500">
                            Duration (seconds)
                          </label>
                          <input
                            type="range"
                            min="1"
                            max="30"
                            value={soundscapeDuration}
                            onChange={(e) => setSoundscapeDuration(Number(e.target.value))}
                            className="mt-2 w-full"
                          />
                          <div className="text-center text-sm text-neutral-600 mt-1">
                            {soundscapeDuration}s
                          </div>
                        </div>
                        <div className="flex items-center">
                          <label className="flex items-center gap-2 cursor-pointer text-sm">
                            <input
                              type="checkbox"
                              checked={soundscapeLoop}
                              onChange={(e) => setSoundscapeLoop(e.target.checked)}
                              className="rounded border-neutral-400"
                            />
                            Loop seamlessly
                          </label>
                        </div>
                      </div>
                    </div>
                  )}
                </motion.div>
              )}

              {stage === "profiles" && (
                <motion.div
                  key="audio-profiles"
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
                      Accessibility profiles
                    </h2>
                    <p className="text-sm text-neutral-600 mt-1">
                      Select learning profiles to optimize audio processing for neurodivergent listeners.
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
                  key="audio-configure"
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
                      Review & fine-tune
                    </h2>
                    <p className="text-sm text-neutral-600 mt-1">
                      Adjust profile settings and language preferences.
                    </p>
                  </div>
                  <TransformConfig
                    selectedProfiles={selectedProfiles}
                    config={config}
                    onConfigChange={updateConfig}
                  />
                  <div className="mt-6">
                    <LanguageSelector
                      value={targetLanguage}
                      onChange={setTargetLanguage}
                      disabled={audioInputMode === "dub"}
                      helpText={audioInputMode === "dub" 
                        ? "Target language is set separately for dubbing" 
                        : "Language for audio processing and any text elements"}
                    />
                  </div>
                  {audioInputMode === "dub" && (
                    <div className="mt-6">
                      <label className="text-xs uppercase tracking-[0.15em] text-neutral-500">
                        Target language for dubbing
                      </label>
                      <LanguageSelector
                        value={targetLanguage}
                        onChange={setTargetLanguage}
                        helpText="The language to translate the audio into"
                      />
                    </div>
                  )}
                </motion.div>
              )}

              {stage === "processing" && (
                <motion.div
                  key="audio-processing"
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -20 }}
                  transition={{ duration: 0.4 }}
                  className="text-center py-20"
                >
                  <ProcessingPipeline
                    currentStep={processingStep}
                    totalSteps={TOTAL_PIPELINE_STEPS}
                  />
                  <div className="mt-8 space-y-3">
                    <span className="inline-flex items-center gap-2 text-xs uppercase tracking-[0.15em] text-neutral-500">
                      <Sparkle className="w-4 h-4" weight="fill" />
                      Generating
                    </span>
                    <h2 className="mt-3 text-3xl md:text-4xl font-normal text-neutral-900 leading-[1.1] tracking-tight">
                      {processingLabel}
                    </h2>
                    <p className="mt-3 text-sm text-neutral-600 leading-relaxed max-w-md mx-auto">
                      Runway is processing your audio with neurodivergent-safe parameters. This may take a minute or two.
                    </p>
                    {taskId && (
                      <p className="mt-2 text-xs text-neutral-500 font-mono">Task: {taskId}</p>
                    )}
                  </div>
                </motion.div>
              )}

              {stage === "result" && (
                <motion.div
                  key="audio-result"
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.35 }}
                  className="mt-4"
                >
                  <div className="rounded-[1.5rem] bg-neutral-100/95 backdrop-blur-sm border border-neutral-200 p-6 md:p-8">
                    <div className="space-y-6">
                      <div>
                        <h3 className="text-lg font-medium text-neutral-900">
                          Audio ready
                        </h3>
                        <p className="text-sm text-neutral-600 mt-1">
                          Your neurodivergent-safe audio has been generated.
                        </p>
                      </div>
                      {outputUrl && (
                        <div className="rounded-xl border border-neutral-200 overflow-hidden bg-white p-4">
                          <audio
                            src={outputUrl}
                            controls
                            loop={audioInputMode === "soundscape" && soundscapeLoop}
                            className="w-full"
                            preload="metadata"
                          />
                          <div className="mt-3 flex items-center justify-between">
                            <div className="text-xs text-neutral-500">
                              {audioInputMode === "renarrate" 
                                ? "Re-narrated with calm voice" 
                                : audioInputMode === "dub"
                                  ? "Localized lecture"
                                  : "Sensory-safe soundscape"}
                            </div>
                            <a
                              href={outputUrl}
                              download
                              className="text-xs text-neutral-700 hover:text-neutral-900 underline"
                            >
                              Download
                            </a>
                          </div>
                        </div>
                      )}
                      <div className="flex items-center justify-between pt-4 border-t border-neutral-200">
                        <div className="text-xs text-neutral-500">
                          Profiles: {Array.from(selectedProfiles).join(", ")}
                        </div>
                        <button
                          onClick={handleReset}
                          className="text-xs text-neutral-600 hover:text-neutral-900 transition-colors"
                        >
                          Create another
                        </button>
                      </div>
                    </div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            {isWizardStage && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.1 }}
                className="mt-8 flex items-center justify-between"
              >
                {wizardIdx > 0 ? (
                  <button
                    type="button"
                    onClick={() => setStage(WIZARD_STEPS[wizardIdx - 1].key as Stage)}
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
                    type="button"
                    whileHover={{ scale: canAdvance ? 1.02 : 1 }}
                    whileTap={{ scale: canAdvance ? 0.98 : 1 }}
                    onClick={handleStartAudioGenerate}
                    disabled={!canAdvance || selectedProfiles.size === 0}
                    className="flex items-center bg-neutral-900 text-white rounded-full pl-2 pr-6 py-2 gap-3 hover:bg-neutral-950 transition-colors disabled:opacity-35 disabled:cursor-not-allowed"
                  >
                    <span className="bg-white/15 rounded-full p-1.5 flex items-center justify-center">
                      <ArrowSquareOut weight="fill" className="w-4 h-4 text-white" />
                    </span>
                    <span className="text-sm font-normal">Generate safe audio</span>
                  </motion.button>
                ) : (
                  <motion.button
                    type="button"
                    whileHover={{ scale: canAdvance ? 1.02 : 1 }}
                    whileTap={{ scale: canAdvance ? 0.98 : 1 }}
                    onClick={() => setStage(WIZARD_STEPS[wizardIdx + 1].key as Stage)}
                    disabled={!canAdvance}
                    className="flex items-center bg-neutral-900 text-white rounded-full pl-2 pr-6 py-2 gap-3 hover:bg-neutral-950 transition-colors disabled:opacity-35 disabled:cursor-not-allowed"
                  >
                    <span className="bg-white/15 rounded-full p-1.5 flex items-center justify-center">
                      <ArrowRight weight="fill" className="w-4 h-4" />
                    </span>
                    <span className="text-sm font-normal">
                      {stage === "upload" ? "Choose profiles" : "Review settings"}
                    </span>
                  </motion.button>
                )}
              </motion.div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
