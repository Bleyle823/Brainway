import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState, useEffect, useCallback, useRef } from "react";
import { motion, AnimatePresence } from "motion/react";
import {
  ArrowLeft,
  ArrowRight,
  Sparkle,
  WarningCircle,
  VideoCamera,
  Image,
  Play,
  Download,
  MagicWand,
} from "@phosphor-icons/react";
import ProfileSelector, { type ProfileId } from "@/components/transform/ProfileSelector";
import {
  startEducatorGenerateFn,
  validateGenerationInputFn,
  pollTaskFn,
  cancelTaskFn,
} from "@/lib/educator-generate-fns";

export const Route = createFileRoute("/create")({
  component: CreatePage,
  head: () => ({
    meta: [
      { title: "Create Educational Video — Brainwave" },
      {
        name: "description",
        content:
          "Generate neurodivergent-friendly educational videos using AI. Create calm, accessible content from text prompts or images.",
      },
    ],
  }),
});

type GenerationMode = "text" | "image";
type Stage = "setup" | "generating" | "result";

const RATIOS = [
  { value: "1280:720" as const, label: "16:9 Landscape" },
  { value: "720:1280" as const, label: "9:16 Portrait" },
  { value: "960:960" as const, label: "1:1 Square" },
  { value: "1104:832" as const, label: "4:3 Classic" },
] as const;

/**
 * Gen4.5 text-to-video only accepts landscape (1280:720) or portrait (720:1280).
 * Image-to-video accepts the full set above.
 */
const TEXT_RATIO_VALUES = ["1280:720", "720:1280"] as const;
type RatioValue = typeof RATIOS[number]["value"];
function isValidTextRatio(r: RatioValue): r is "1280:720" | "720:1280" {
  return (TEXT_RATIO_VALUES as readonly string[]).includes(r);
}

const DURATIONS = [
  { value: 2, label: "2 seconds" },
  { value: 3, label: "3 seconds" },
  { value: 5, label: "5 seconds" },
  { value: 8, label: "8 seconds" },
  { value: 10, label: "10 seconds" },
] as const;

/** Poll interval while generation task is running */
const POLL_INTERVAL_MS = 3_000;
/** Max file size for image uploads (8 MB) */
const MAX_IMAGE_BYTES = 8 * 1024 * 1024;

/** Convert a File to a base64 data URI */
function fileToDataUri(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = () => reject(new Error("Failed to read file"));
    reader.readAsDataURL(file);
  });
}

function CreatePage() {
  const navigate = useNavigate();
  const [mode, setMode] = useState<GenerationMode>("text");
  const [stage, setStage] = useState<Stage>("setup");
  const [prompt, setPrompt] = useState("");
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imageUrl, setImageUrl] = useState("");
  const [imageMode, setImageMode] = useState<"file" | "url">("file");
  const [ratio, setRatio] = useState<RatioValue>("1280:720");
  const [duration, setDuration] = useState(5);
  const [selectedProfiles, setSelectedProfiles] = useState<Set<ProfileId>>(new Set());
  const [taskId, setTaskId] = useState<string | null>(null);
  const [outputUrl, setOutputUrl] = useState<string | null>(null);
  const [taskError, setTaskError] = useState<string | null>(null);
  const [enhancedPrompt, setEnhancedPrompt] = useState("");
  const [promptLength, setPromptLength] = useState(0);

  const pollTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const isMountedRef = useRef(true);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    isMountedRef.current = true;
    return () => {
      isMountedRef.current = false;
      if (pollTimerRef.current) clearTimeout(pollTimerRef.current);
    };
  }, []);

  // Snap to a valid landscape/portrait ratio when switching to text-to-video mode
  // (gen4.5 t2v only supports 1280:720 / 720:1280).
  useEffect(() => {
    if (mode === "text" && !isValidTextRatio(ratio)) {
      setRatio("1280:720");
    }
  }, [mode, ratio]);

  // Validate prompt in real-time
  useEffect(() => {
    if (prompt.trim()) {
      validateGenerationInputFn({
        data: { mode, prompt, profiles: Array.from(selectedProfiles) },
      }).then(result => {
        if (isMountedRef.current) {
          setEnhancedPrompt(result.enhancedPrompt);
          setPromptLength(result.promptLength);
        }
      }).catch(() => {
        // Ignore validation errors during typing
      });
    } else {
      setEnhancedPrompt("");
      setPromptLength(0);
    }
  }, [prompt, mode, selectedProfiles]);

  // Polling logic
  const scheduleNextPoll = useCallback((id: string) => {
    if (pollTimerRef.current) clearTimeout(pollTimerRef.current);
    pollTimerRef.current = setTimeout(async () => {
      if (!isMountedRef.current) return;
      try {
        const task = await pollTaskFn({ data: { taskId: id } });
        if (!isMountedRef.current) return;

        if (task.status === "SUCCEEDED") {
          setOutputUrl(task.output?.[0] ?? null);
          setStage("result");
        } else if (task.status === "FAILED" || task.status === "CANCELLED") {
          setTaskError(
            task.failure ??
              `Generation ${task.status.toLowerCase()}. Please try again.`,
          );
          setStage("setup");
        } else {
          scheduleNextPoll(id);
        }
      } catch (err) {
        if (!isMountedRef.current) return;
        setTaskError(
          err instanceof Error ? err.message : "Failed to poll task status.",
        );
        setStage("setup");
      }
    }, POLL_INTERVAL_MS);
  }, []);

  const handleGenerate = useCallback(async () => {
    if (!prompt.trim()) return;

    setTaskError(null);
    setOutputUrl(null);
    setStage("generating");

    try {
      let imageSource: string | undefined;

      if (mode === "image") {
        if (imageMode === "file" && imageFile) {
          if (imageFile.size > MAX_IMAGE_BYTES) {
            throw new Error("Image file too large. Please use an image under 8 MB.");
          }
          imageSource = await fileToDataUri(imageFile);
        } else if (imageMode === "url" && imageUrl.trim()) {
          imageSource = imageUrl.trim();
        } else {
          throw new Error("Please provide an image file or URL for image-to-video mode.");
        }
      }

      const result = await startEducatorGenerateFn({
        data: {
          mode,
          prompt: prompt.trim(),
          imageSource,
          ratio,
          duration,
          profiles: Array.from(selectedProfiles),
        },
      });

      setTaskId(result.taskId);
      scheduleNextPoll(result.taskId);
    } catch (err) {
      setTaskError(
        err instanceof Error ? err.message : "Failed to start generation.",
      );
      setStage("setup");
    }
  }, [mode, prompt, imageFile, imageUrl, imageMode, ratio, duration, selectedProfiles, scheduleNextPoll]);

  const handleImageFileSelect = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > MAX_IMAGE_BYTES) {
        setTaskError("Image file too large. Please use an image under 8 MB.");
        return;
      }
      if (!file.type.startsWith("image/")) {
        setTaskError("Please select an image file.");
        return;
      }
      setImageFile(file);
      setTaskError(null);
    }
  }, []);

  const handleEnhanceInTransform = useCallback(() => {
    if (outputUrl) {
      navigate({
        to: "/transform",
        search: { videoUrl: outputUrl },
      });
    }
  }, [outputUrl, navigate]);

  const canGenerate = prompt.trim() && 
    (mode === "text" || (mode === "image" && 
      ((imageMode === "file" && imageFile) || (imageMode === "url" && imageUrl.trim()))));

  return (
    <div className="min-h-screen bg-gradient-to-br from-neutral-50 to-neutral-100">
      <div className="mx-auto max-w-4xl px-4 py-8">
        {/* Header */}
        <div className="mb-8 text-center">
          <h1 className="text-3xl font-bold text-neutral-900 mb-2">
            Create Educational Video
          </h1>
          <p className="text-neutral-600 max-w-2xl mx-auto">
            Generate calm, neurodivergent-friendly videos from your ideas. Choose text-to-video 
            or start from an image to create accessible educational content.
          </p>
        </div>

        <AnimatePresence mode="wait">
          {stage === "setup" && (
            <motion.div
              key="setup"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="space-y-8"
            >
              {/* Mode Selection */}
              <div className="bg-white rounded-xl border border-neutral-200 p-6">
                <h2 className="text-xl font-semibold text-neutral-900 mb-4">
                  Generation Mode
                </h2>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <button
                    onClick={() => setMode("text")}
                    className={`p-4 rounded-lg border-2 transition-all ${
                      mode === "text"
                        ? "border-neutral-900 bg-neutral-50"
                        : "border-neutral-200 hover:border-neutral-300"
                    }`}
                  >
                    <VideoCamera className="w-6 h-6 mx-auto mb-2" />
                    <div className="font-medium">Text to Video</div>
                    <div className="text-sm text-neutral-600">
                      Generate video from text description
                    </div>
                  </button>
                  <button
                    onClick={() => setMode("image")}
                    className={`p-4 rounded-lg border-2 transition-all ${
                      mode === "image"
                        ? "border-neutral-900 bg-neutral-50"
                        : "border-neutral-200 hover:border-neutral-300"
                    }`}
                  >
                    <Image className="w-6 h-6 mx-auto mb-2" />
                    <div className="font-medium">Image to Video</div>
                    <div className="text-sm text-neutral-600">
                      Animate an existing image
                    </div>
                  </button>
                </div>
              </div>

              {/* Content Input */}
              <div className="bg-white rounded-xl border border-neutral-200 p-6">
                <h2 className="text-xl font-semibold text-neutral-900 mb-4">
                  Content Description
                </h2>
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-neutral-700 mb-2">
                      Describe what you want in your video
                    </label>
                    <textarea
                      value={prompt}
                      onChange={(e) => setPrompt(e.target.value)}
                      placeholder="A teacher explaining basic math concepts with friendly gestures..."
                      className="w-full h-32 px-3 py-2 border border-neutral-300 rounded-lg focus:ring-2 focus:ring-neutral-900 focus:border-transparent resize-none"
                    />
                    {enhancedPrompt && (
                      <div className="mt-2 text-xs text-neutral-600">
                        Enhanced prompt: {promptLength}/1000 characters
                      </div>
                    )}
                  </div>

                  {/* Image Input for Image-to-Video */}
                  {mode === "image" && (
                    <div>
                      <label className="block text-sm font-medium text-neutral-700 mb-2">
                        Source Image
                      </label>
                      <div className="space-y-3">
                        <div className="flex gap-2">
                          <button
                            onClick={() => setImageMode("file")}
                            className={`px-3 py-1 text-sm rounded ${
                              imageMode === "file"
                                ? "bg-neutral-900 text-white"
                                : "bg-neutral-100 text-neutral-700"
                            }`}
                          >
                            Upload File
                          </button>
                          <button
                            onClick={() => setImageMode("url")}
                            className={`px-3 py-1 text-sm rounded ${
                              imageMode === "url"
                                ? "bg-neutral-900 text-white"
                                : "bg-neutral-100 text-neutral-700"
                            }`}
                          >
                            Image URL
                          </button>
                        </div>

                        {imageMode === "file" ? (
                          <div>
                            <input
                              ref={fileInputRef}
                              type="file"
                              accept="image/*"
                              onChange={handleImageFileSelect}
                              className="hidden"
                            />
                            <button
                              onClick={() => fileInputRef.current?.click()}
                              className="w-full p-4 border-2 border-dashed border-neutral-300 rounded-lg hover:border-neutral-400 transition-colors"
                            >
                              {imageFile ? (
                                <div className="text-sm text-neutral-700">
                                  Selected: {imageFile.name}
                                </div>
                              ) : (
                                <div className="text-sm text-neutral-500">
                                  Click to select an image file (max 8 MB)
                                </div>
                              )}
                            </button>
                          </div>
                        ) : (
                          <input
                            type="url"
                            value={imageUrl}
                            onChange={(e) => setImageUrl(e.target.value)}
                            placeholder="https://example.com/image.jpg"
                            className="w-full px-3 py-2 border border-neutral-300 rounded-lg focus:ring-2 focus:ring-neutral-900 focus:border-transparent"
                          />
                        )}
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* Accessibility Profiles */}
              <div className="bg-white rounded-xl border border-neutral-200 p-6">
                <h2 className="text-xl font-semibold text-neutral-900 mb-4">
                  Accessibility Preferences
                </h2>
                <p className="text-sm text-neutral-600 mb-4">
                  Select learning profiles to automatically apply neurodivergent-friendly constraints
                </p>
                <ProfileSelector
                  selected={selectedProfiles}
                  onToggle={(id) => {
                    const newProfiles = new Set(selectedProfiles);
                    if (newProfiles.has(id)) {
                      newProfiles.delete(id);
                    } else {
                      newProfiles.add(id);
                    }
                    setSelectedProfiles(newProfiles);
                  }}
                />
              </div>

              {/* Video Settings */}
              <div className="bg-white rounded-xl border border-neutral-200 p-6">
                <h2 className="text-xl font-semibold text-neutral-900 mb-4">
                  Video Settings
                </h2>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <label className="block text-sm font-medium text-neutral-700 mb-2">
                      Aspect Ratio
                    </label>
                    <select
                      value={ratio}
                      onChange={(e) => setRatio(e.target.value as RatioValue)}
                      className="w-full px-3 py-2 border border-neutral-300 rounded-lg focus:ring-2 focus:ring-neutral-900 focus:border-transparent"
                    >
                      {RATIOS.filter((r) =>
                        mode === "text" ? isValidTextRatio(r.value) : true,
                      ).map((r) => (
                        <option key={r.value} value={r.value}>
                          {r.label}
                        </option>
                      ))}
                    </select>
                    {mode === "text" && (
                      <p className="mt-1.5 text-xs text-neutral-500">
                        Gen4.5 text-to-video supports landscape and portrait only.
                      </p>
                    )}
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-neutral-700 mb-2">
                      Duration
                    </label>
                    <select
                      value={duration}
                      onChange={(e) => setDuration(Number(e.target.value))}
                      className="w-full px-3 py-2 border border-neutral-300 rounded-lg focus:ring-2 focus:ring-neutral-900 focus:border-transparent"
                    >
                      {DURATIONS.map((d) => (
                        <option key={d.value} value={d.value}>
                          {d.label}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
              </div>

              {/* Error Banner */}
              <AnimatePresence>
                {taskError && (
                  <motion.div
                    initial={{ opacity: 0, y: 6 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -4 }}
                    className="flex items-start gap-3 rounded-xl bg-red-50 border border-red-200 px-4 py-3"
                  >
                    <WarningCircle weight="fill" className="w-4 h-4 text-red-500 shrink-0 mt-0.5" />
                    <p className="text-sm text-red-700 leading-snug">{taskError}</p>
                  </motion.div>
                )}
              </AnimatePresence>

              {/* Generate Button */}
              <div className="flex justify-center">
                <button
                  onClick={handleGenerate}
                  disabled={!canGenerate}
                  className="inline-flex items-center gap-2 px-8 py-3 bg-neutral-900 text-white rounded-lg font-medium hover:bg-neutral-800 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  <Sparkle className="w-4 h-4" />
                  Generate Video
                </button>
              </div>
            </motion.div>
          )}

          {stage === "generating" && (
            <motion.div
              key="generating"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="text-center py-16"
            >
              <div className="animate-spin w-12 h-12 border-4 border-neutral-200 border-t-neutral-900 rounded-full mx-auto mb-4" />
              <h2 className="text-xl font-semibold text-neutral-900 mb-2">
                Generating Your Video
              </h2>
              <p className="text-neutral-600">
                This may take 1-3 minutes. We're creating a calm, learner-friendly video for you.
              </p>
            </motion.div>
          )}

          {stage === "result" && outputUrl && (
            <motion.div
              key="result"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="space-y-6"
            >
              <div className="text-center">
                <h2 className="text-2xl font-semibold text-neutral-900 mb-2">
                  Video Generated Successfully!
                </h2>
                <p className="text-neutral-600">
                  Your neurodivergent-friendly video is ready. Preview it below or enhance it further.
                </p>
              </div>

              {/* Video Preview */}
              <div className="bg-white rounded-xl border border-neutral-200 p-6">
                <div className="aspect-video bg-neutral-100 rounded-lg overflow-hidden">
                  <video
                    src={outputUrl}
                    controls
                    className="w-full h-full object-contain"
                    preload="metadata"
                  />
                </div>
              </div>

              {/* Actions */}
              <div className="flex flex-col sm:flex-row gap-4 justify-center">
                <a
                  href={outputUrl}
                  download
                  className="inline-flex items-center justify-center gap-2 px-6 py-3 bg-white border border-neutral-300 text-neutral-700 rounded-lg font-medium hover:bg-neutral-50 transition-colors"
                >
                  <Download className="w-4 h-4" />
                  Download Video
                </a>
                <button
                  onClick={handleEnhanceInTransform}
                  className="inline-flex items-center justify-center gap-2 px-6 py-3 bg-neutral-900 text-white rounded-lg font-medium hover:bg-neutral-800 transition-colors"
                >
                  <MagicWand className="w-4 h-4" />
                  Enhance for Learners
                </button>
              </div>

              {/* Create Another */}
              <div className="text-center">
                <button
                  onClick={() => {
                    setStage("setup");
                    setTaskId(null);
                    setOutputUrl(null);
                    setTaskError(null);
                  }}
                  className="text-neutral-600 hover:text-neutral-900 transition-colors"
                >
                  Create Another Video
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}