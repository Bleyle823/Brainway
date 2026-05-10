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
import LanguageSelector from "@/components/LanguageSelector";
import { DEFAULT_LANGUAGE_CODE } from "@/lib/languages";
import {
  createUploadIntentFn,
  startCalmReNarrateFn,
  startLocalizedLectureFn,
  startSensorySoundscapeFn,
  pollTaskFn,
  cancelTaskFn,
} from "@/lib/transform-fns";
import type { SoundscapeId } from "@/lib/safe-audio-prompts";
import {
  deriveVoiceDubbingAccessibilityOptions,
} from "@/lib/safe-audio-prompts";
import {
  VOICE_DUBBING_LANGUAGES,
  isRunwayVoiceDubbingLang,
} from "@/lib/runway-voice-dubbing-languages";
import {
  fileToDataUri,
  mapProgressToStep,
  MAX_DATAURI_BYTES,
  POLL_INTERVAL_MS,
  TOTAL_PIPELINE_STEPS,
} from "@/lib/transform-helpers";

const safeAudioSearchSchema = z.object({
  audioMode: z.enum(["renarrate", "dub", "soundscape"]).optional(),
});

export const Route = createFileRoute("/safe-audio")({
  validateSearch: safeAudioSearchSchema,
  component: SafeAudioPage,
  head: () => ({
    meta: [
      { title: "Safe Audio — Brainway" },
      {
        name: "description",
        content:
          "Calm re-narration, localization, and sensory-safe soundscapes for neurodivergent learners.",
      },
    ],
  }),
});

type Stage = "upload" | "profiles" | "configure" | "processing" | "result";
type AudioInputMode = "renarrate" | "dub" | "soundscape";

const WIZARD_STEPS: { key: Stage; label: string }[] = [
  { key: "upload", label: "Upload" },
  { key: "profiles", label: "Profiles" },
  { key: "configure", label: "Configure" },
];

function SafeAudioPage() {
  const { audioMode: audioModeSearch } = Route.useSearch();

  const [stage, setStage] = useState<Stage>("upload");
  const [selectedProfiles, setSelectedProfiles] = useState<Set<ProfileId>>(new Set());
  const [config, setConfig] = useState<AllConfig>({} as AllConfig);
  const [processingStep, setProcessingStep] = useState(0);
  const [taskId, setTaskId] = useState<string | null>(null);
  const [outputUrl, setOutputUrl] = useState<string | null>(null);
  const [taskError, setTaskError] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [targetLanguage, setTargetLanguage] = useState(DEFAULT_LANGUAGE_CODE);

  const [audioInputMode, setAudioInputMode] = useState<AudioInputMode>("renarrate");

  const [audioReNarrateFile, setAudioReNarrateFile] = useState<File | null>(null);
  const [audioReNarrateUrl, setAudioReNarrateUrl] = useState("");
  const [audioReNarrateMode, setAudioReNarrateMode] = useState<"file" | "url">("file");
  const [audioReNarrateMediaType, setAudioReNarrateMediaType] = useState<"audio" | "video">("audio");
  const [audioReNarrateVoicePreset, setAudioReNarrateVoicePreset] = useState("");
  const audioReNarrateFileInputRef = useRef<HTMLInputElement>(null);

  const [audioDubbingFile, setAudioDubbingFile] = useState<File | null>(null);
  const [audioDubbingUrl, setAudioDubbingUrl] = useState("");
  const [audioDubbingMode, setAudioDubbingMode] = useState<"file" | "url">("file");
  const audioDubbingFileInputRef = useRef<HTMLInputElement>(null);

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
    if (audioModeSearch) {
      setAudioInputMode(audioModeSearch);
    }
  }, [audioModeSearch]);

  useEffect(() => {
    if (audioInputMode !== "dub") return;
    if (!isRunwayVoiceDubbingLang(targetLanguage)) {
      setTargetLanguage(DEFAULT_LANGUAGE_CODE);
    }
  }, [audioInputMode, targetLanguage]);

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

  const resetAudioFormState = useCallback(() => {
    setAudioInputMode("renarrate");
    setAudioReNarrateFile(null);
    setAudioReNarrateUrl("");
    setAudioReNarrateMode("file");
    setAudioReNarrateMediaType("audio");
    setAudioReNarrateVoicePreset("");
    setAudioDubbingFile(null);
    setAudioDubbingUrl("");
    setAudioDubbingMode("file");
    setSoundscapeScene("pinkNoiseRain");
    setSoundscapeDuration(10);
    setSoundscapeLoop(true);
    setSoundscapeCustomNotes("");
  }, []);

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
    setIsUploading(false);
    setTargetLanguage(DEFAULT_LANGUAGE_CODE);
    resetAudioFormState();
    sssScore.current = Math.floor(Math.random() * 8) + 88;
  }, [taskId, resetAudioFormState]);

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
        : true;

  const canAdvance =
    (stage === "upload" && audioStep1Ready) ||
    (stage === "profiles" && selectedProfiles.size > 0) ||
    stage === "configure";

  const isWizardStage = wizardIdx !== -1;

  const processingLabel = isUploading
    ? "Uploading media to Runway…"
    : taskId
      ? "Processing neurodivergent-safe audio…"
      : "Starting audio job…";

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
            to="/safe-images"
            className="text-xs font-normal text-neutral-500 uppercase tracking-[0.15em] hover:text-neutral-900"
          >
            Safe images
          </Link>
        </div>
      </nav>

      <div className="max-w-2xl mx-auto px-4 pb-20">
        <AnimatePresence>
          {isWizardStage && (
            <motion.div
              key="header-audio"
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.4 }}
              className="mt-4 mb-10"
            >
              <span className="text-xs uppercase tracking-[0.2em] text-neutral-500">
                Safe audio
              </span>
              <h1 className="mt-3 text-3xl md:text-5xl font-normal text-neutral-900 leading-[1.08] tracking-tight">
                Calm audio for neurodivergent listeners.
              </h1>
              <p className="mt-4 text-sm md:text-base text-neutral-600 leading-relaxed max-w-lg">
                Re-narrate, localize, or generate sensory-safe soundscapes using the same accessibility
                profiles as video and images.
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
                    Translate audio to the learner&apos;s preferred language while preserving voice characteristics.
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
                        {audioDubbingFile ? audioDubbingFile.name : "Audio file (max 12 MB)"}
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
                  <div className="pt-2">
                    <LanguageSelector
                      languages={VOICE_DUBBING_LANGUAGES}
                      value={targetLanguage}
                      onChange={setTargetLanguage}
                      label="Dub into language"
                    />
                    <p className="mt-1.5 text-xs text-neutral-500">
                      Any of Runway ElevenLabs dubbing locales. You can adjust again in step 3.
                    </p>
                  </div>
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
                <h2 className="text-xl font-normal text-neutral-900">Accessibility profiles</h2>
                <p className="text-sm text-neutral-600 mt-1">
                  Select learning profiles to optimize audio processing for neurodivergent listeners.
                </p>
              </div>
              <ProfileSelector selected={selectedProfiles} onToggle={toggleProfile} />
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
                <h2 className="text-xl font-normal text-neutral-900">Review & fine-tune</h2>
                <p className="text-sm text-neutral-600 mt-1">
                  Adjust profile settings and language preferences.
                </p>
              </div>
              <TransformConfig
                selectedProfiles={selectedProfiles}
                config={config}
                onChange={updateConfig}
              />
              {audioInputMode === "dub" && selectedProfiles.has("sensory") && (
                <div className="mt-6 rounded-xl border border-neutral-200 bg-neutral-50/90 px-4 py-3 space-y-2">
                  <p className="text-xs uppercase tracking-[0.15em] text-neutral-500">
                    Sensory → voice dubbing (Runway API)
                  </p>
                  <p className="text-xs text-neutral-700 leading-snug">
                    {(() => {
                      const o = deriveVoiceDubbingAccessibilityOptions(
                        Array.from(selectedProfiles),
                        config,
                      );
                      return (
                        <>
                          Colour saturation (sensory slider) below ~32% turns on{" "}
                          <strong>generic dub voice</strong> (disable voice cloning). Background
                          ambience cap at or below ~20% strips <strong>background audio</strong> in
                          the dubbed file. Current: cloning{" "}
                          {o.disableVoiceCloning ? "off" : "on"}, beds{" "}
                          {o.dropBackgroundAudio ? "stripped" : "kept"}.
                        </>
                      );
                    })()}
                  </p>
                </div>
              )}
              {audioInputMode === "soundscape" && selectedProfiles.has("sensory") && (
                <div className="mt-6 rounded-xl border border-neutral-200 bg-neutral-50/90 px-4 py-3">
                  <p className="text-xs text-neutral-700 leading-snug">
                    <strong>Sensory soundscapes:</strong> saturation, max audio peak, and background
                    ambience cap in the Sensory profile are written into the text prompt for
                    eleven_text_to_sound — lower saturation and quieter caps steer calmer output.
                  </p>
                </div>
              )}
              <div className="mt-6">
                <LanguageSelector
                  languages={
                    audioInputMode === "dub" ? VOICE_DUBBING_LANGUAGES : undefined
                  }
                  value={targetLanguage}
                  onChange={setTargetLanguage}
                  label={
                    audioInputMode === "dub"
                      ? "Target language for dubbing"
                      : "Language for audio processing"
                  }
                />
                <p className="mt-2 text-xs text-neutral-500 max-w-sm">
                  {audioInputMode === "dub"
                    ? "The lecture audio is translated into this language."
                    : "Used for processing and any text elements in the output."}
                </p>
              </div>
            </motion.div>
          )}

          {stage === "processing" && (
            <motion.div
              key="audio-processing"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              transition={{ duration: 0.4 }}
              className="text-center py-12"
            >
              <div className="rounded-[1.5rem] bg-neutral-100/95 backdrop-blur-sm border border-neutral-200 p-6 md:p-8 text-left">
                <ProcessingPipeline
                  selectedProfiles={selectedProfiles}
                  currentStep={processingStep}
                  score={
                    processingStep >= TOTAL_PIPELINE_STEPS ? sssScore.current : undefined
                  }
                />
              </div>
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
                    <h3 className="text-lg font-medium text-neutral-900">Audio ready</h3>
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
                      type="button"
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
