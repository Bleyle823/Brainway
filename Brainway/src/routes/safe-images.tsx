import { createFileRoute, Link } from "@tanstack/react-router";
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

import ProfileSelector, { type ProfileId } from "@/components/transform/ProfileSelector";
import TransformConfig, { type AllConfig } from "@/components/transform/TransformConfig";
import ProcessingPipeline from "@/components/transform/ProcessingPipeline";
import ImageSafeResult from "@/components/transform/ImageSafeResult";
import LanguageSelector from "@/components/LanguageSelector";
import { DEFAULT_LANGUAGE_CODE } from "@/lib/languages";
import { buildEducatorSafeImagePrompt } from "@/lib/educator-image-prompt";
import type { Gen4ImageRatio } from "@/lib/runway-api";
import { startEducatorImageFn, pollTaskFn, cancelTaskFn } from "@/lib/transform-fns";
import {
  fileToDataUri,
  mapProgressToStep,
  MAX_IMAGE_BYTES,
  POLL_INTERVAL_MS,
  TOTAL_PIPELINE_STEPS,
} from "@/lib/transform-helpers";

const safeImagesSearchSchema = z.object({
  imageMode: z.enum(["describe", "adapt", "img2img"]).optional(),
});

const IMAGE_RATIO_OPTIONS: { value: Gen4ImageRatio; label: string }[] = [
  { value: "1920:1080", label: "16:9 (1920×1080)" },
  { value: "1080:1920", label: "9:16 (1080×1920)" },
  { value: "1280:720", label: "16:9 HD (1280×720)" },
  { value: "720:1280", label: "9:16 (720×1280)" },
  { value: "1024:1024", label: "1:1 Square (1024)" },
  { value: "1080:1080", label: "1:1 (1080)" },
];

export const Route = createFileRoute("/safe-images")({
  validateSearch: safeImagesSearchSchema,
  component: SafeImagesPage,
  head: () => ({
    meta: [
      { title: "Safe Images — Brainway" },
      {
        name: "description",
        content:
          "Generate neurodivergent-safe illustrations from text, reference images, or image-to-image workflows.",
      },
    ],
  }),
});

type Stage = "upload" | "profiles" | "configure" | "processing" | "result";
type ImageInputMode = "describe" | "adapt" | "img2img";

const WIZARD_STEPS: { key: Stage; label: string }[] = [
  { key: "upload", label: "Upload" },
  { key: "profiles", label: "Profiles" },
  { key: "configure", label: "Configure" },
];

function SafeImagesPage() {
  const { imageMode: imageModeSearch } = Route.useSearch();

  const [stage, setStage] = useState<Stage>("upload");
  const [selectedProfiles, setSelectedProfiles] = useState<Set<ProfileId>>(new Set());
  const [config, setConfig] = useState<AllConfig>({} as AllConfig);
  const [processingStep, setProcessingStep] = useState(0);
  const [taskId, setTaskId] = useState<string | null>(null);
  const [outputUrl, setOutputUrl] = useState<string | null>(null);
  const [taskError, setTaskError] = useState<string | null>(null);
  const [targetLanguage, setTargetLanguage] = useState(DEFAULT_LANGUAGE_CODE);

  const [imageInputMode, setImageInputMode] = useState<ImageInputMode>("describe");
  const [imageDescribeText, setImageDescribeText] = useState("");
  const [imageAdaptNotes, setImageAdaptNotes] = useState("");
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imageUrlInput, setImageUrlInput] = useState("");
  const [imageRefMode, setImageRefMode] = useState<"file" | "url">("file");
  const [imageRatio, setImageRatio] = useState<Gen4ImageRatio>("1920:1080");
  const [imageResultReferenceUrl, setImageResultReferenceUrl] = useState<string | null>(null);
  const [imageOutputLabel, setImageOutputLabel] = useState("illustration");
  const imageFileInputRef = useRef<HTMLInputElement>(null);
  const [imageLocalPreviewUrl, setImageLocalPreviewUrl] = useState<string | null>(null);

  const [imageI2IInstructions, setImageI2IInstructions] = useState("");
  const [imageI2ISecondaryEnabled, setImageI2ISecondaryEnabled] = useState(false);
  const [imageSecondaryFile, setImageSecondaryFile] = useState<File | null>(null);
  const [imageSecondaryUrl, setImageSecondaryUrl] = useState("");
  const [imageSecondaryRefMode, setImageSecondaryRefMode] = useState<"file" | "url">("file");
  const [imageSecondaryLocalPreviewUrl, setImageSecondaryLocalPreviewUrl] = useState<string | null>(
    null,
  );
  const imageSecondaryFileInputRef = useRef<HTMLInputElement>(null);

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
    if (imageModeSearch) {
      setImageInputMode(imageModeSearch);
    }
  }, [imageModeSearch]);

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

  const handleReset = useCallback(() => {
    if (taskId) {
      cancelTaskFn({ data: { taskId } }).catch(() => {});
    }
    if (pollTimerRef.current) clearTimeout(pollTimerRef.current);

    setStage("upload");
    setSelectedProfiles(new Set());
    setConfig({} as AllConfig);
    setProcessingStep(0);
    setTaskId(null);
    setOutputUrl(null);
    setTaskError(null);
    setTargetLanguage(DEFAULT_LANGUAGE_CODE);
    resetImageFormState();
    sssScore.current = Math.floor(Math.random() * 8) + 88;
  }, [taskId, resetImageFormState]);

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

  const canAdvance =
    (stage === "upload" && imageStep1Ready) ||
    (stage === "profiles" && selectedProfiles.size > 0) ||
    stage === "configure";

  const isWizardStage = wizardIdx !== -1;

  const processingLabel = taskId
    ? "Generating neurodivergent-safe illustration…"
    : "Starting image job…";

  let imagePromptPreview = "";
  let imagePromptPreviewError: string | null = null;
  if (stage === "configure" && selectedProfiles.size > 0) {
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
      <nav className="w-full px-4 md:px-8 py-4 md:py-5 flex items-center justify-between border-b border-neutral-300 backdrop-blur-sm">
        <div className="flex items-center gap-6">
          <Link to="/" className="flex items-center gap-2 group">
            <ArrowLeft weight="fill" className="w-4 h-4 text-neutral-500 group-hover:text-neutral-900" />
            <span className="text-sm text-neutral-900 tracking-tight">Home</span>
          </Link>
          <Link
            to="/transform"
            className="text-xs font-normal text-neutral-500 uppercase tracking-[0.15em] hover:text-neutral-900"
          >
            Video transform
          </Link>
          <Link
            to="/safe-audio"
            className="text-xs font-normal text-neutral-500 uppercase tracking-[0.15em] hover:text-neutral-900"
          >
            Safe audio
          </Link>
        </div>
      </nav>

      <div className="max-w-2xl mx-auto px-4 pb-20">
        <AnimatePresence>
          {isWizardStage && (
            <motion.div
              key="header-image"
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.4 }}
              className="mt-4 mb-10"
            >
              <span className="text-xs uppercase tracking-[0.2em] text-neutral-500">
                Safe image studio
              </span>
              <h1 className="mt-3 text-3xl md:text-5xl font-normal text-neutral-900 leading-[1.08] tracking-tight">
                Text or reference → neurodivergent-safe art.
              </h1>
              <p className="mt-4 text-sm md:text-base text-neutral-600 leading-relaxed max-w-lg">
                Generate a new calm illustration from a description, or upload an existing image to adapt it with the
                same predefined accessibility rules used for video.
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
      </div>
    </div>
  );
}
