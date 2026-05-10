import { createFileRoute, Link } from "@tanstack/react-router";
import { useCallback, useEffect, useState } from "react";
import { z } from "zod";
import { motion, AnimatePresence } from "motion/react";
import {
  ArrowLeft,
  ArrowSquareOut,
  CaretLeft,
  CaretRight,
  CircleNotch,
} from "@phosphor-icons/react";
import { AvatarSession } from "@runwayml/avatars-react";
import "@runwayml/avatars-react/styles.css";

import RecallSessionControls from "@/components/meet/RecallSessionControls";
import ProfileSelector, { type ProfileId } from "@/components/transform/ProfileSelector";
import TransformConfig from "@/components/transform/TransformConfig";
import SessionView from "@/components/live/SessionView";
import ZoomMeetHelp from "@/components/live/ZoomMeetHelp";
import LanguageSelector from "@/components/LanguageSelector";
import { useLiveCharacterSession } from "@/components/live/useLiveCharacterSession";
import { MEET_PROFILE_PRESETS, parseProfilesSearchParam } from "@/lib/meet-presets";
import {
  recallBridgeStatusFn,
  recallStartMeetingFn,
} from "@/lib/recall-meet-fns";
import { RUNWAY_PRESET_CHARACTERS } from "@/lib/runway-character-presets";

const meetSearchSchema = z.object({
  profiles: z.string().optional(),
});

export const Route = createFileRoute("/meet")({
  validateSearch: meetSearchSchema,
  component: MeetCharactersPage,
  head: () => ({
    meta: [
      { title: "Join class — Profile-safe Character — Brainwave" },
      {
        name: "description",
        content:
          "Paste a Zoom, Meet, or Teams link and send a Runway Character as a participant—with ADHD-, autism-, dyslexia-, and sensory-aware prompts.",
      },
    ],
  }),
});

type WizardStep = 1 | 2 | 3;

function isValidHttpUrl(s: string): boolean {
  try {
    const u = new URL(s.trim());
    return u.protocol === "http:" || u.protocol === "https:";
  } catch {
    return false;
  }
}

function MeetCharactersPage() {
  const { profiles: profilesParam } = Route.useSearch();
  const [wizardStep, setWizardStep] = useState<WizardStep>(1);
  const [bridgeConfigured, setBridgeConfigured] = useState<boolean | null>(null);
  const [recallSessionId, setRecallSessionId] = useState<string | null>(null);
  const [recallStarting, setRecallStarting] = useState(false);

  const [meetingUrl, setMeetingUrl] = useState("");
  const [meetingPassword, setMeetingPassword] = useState("");
  const [avatarKind, setAvatarKind] = useState<"preset" | "custom">("preset");
  const [presetAvatarId, setPresetAvatarId] = useState("music-superstar");
  const [customAvatarId, setCustomAvatarId] = useState("");
  const [botDisplayName, setBotDisplayName] = useState("Brainwave Character");

  const {
    stage,
    setStage,
    selectedProfiles,
    setSelectedProfiles,
    toggleProfile,
    config,
    updateConfig,
    credentials,
    setCredentials,
    error,
    setError,
    clientReady,
    targetLanguage,
    setTargetLanguage,
    resetAll,
    handleStartSession,
    canStart,
  } = useLiveCharacterSession();

  useEffect(() => {
    recallBridgeStatusFn()
      .then((r) => setBridgeConfigured(r.configured))
      .catch(() => setBridgeConfigured(false));
  }, []);

  useEffect(() => {
    const parsed = parseProfilesSearchParam(profilesParam);
    if (parsed) setSelectedProfiles(parsed);
  }, [profilesParam, setSelectedProfiles]);

  const applyPreset = (profiles: ProfileId[]) => {
    setSelectedProfiles(new Set(profiles));
  };

  const resetWizardSession = () => {
    resetAll();
    setWizardStep(1);
    setRecallSessionId(null);
  };

  const avatarIdForRecall =
    avatarKind === "preset" ? presetAvatarId : customAvatarId.trim();
  const step2CanProceed =
    isValidHttpUrl(meetingUrl) && avatarIdForRecall.length > 0;

  const handleSendCharacterToMeeting = useCallback(async () => {
    if (!canStart || !step2CanProceed || recallStarting) return;
    setError(null);
    setRecallStarting(true);
    try {
      const { sessionId } = await recallStartMeetingFn({
        data: {
          meetingUrl: meetingUrl.trim(),
          meetingPassword: meetingPassword.trim() || undefined,
          avatarType: avatarKind,
          avatarId: avatarIdForRecall,
          botName: botDisplayName.trim() || "Brainwave Character",
          profiles: Array.from(selectedProfiles),
          config,
          targetLanguage,
        },
      });
      setRecallSessionId(sessionId);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not start meeting bot.");
    } finally {
      setRecallStarting(false);
    }
  }, [
    avatarIdForRecall,
    avatarKind,
    botDisplayName,
    canStart,
    config,
    meetingPassword,
    meetingUrl,
    recallStarting,
    selectedProfiles,
    setError,
    step2CanProceed,
    targetLanguage,
  ]);

  const stepCopy: Record<WizardStep, { title: string; subtitle: string }> = {
    1: {
      title: "Pick how the companion should behave",
      subtitle:
        "Quick presets set ADHD, sensory, or all learner-safe modes. These rules feed the Character when you use a custom avatar with Recall.",
    },
    2: {
      title: "Paste your meeting link & character",
      subtitle:
        "Any Zoom, Google Meet, or Microsoft Teams URL. Choose a Runway preset or your own character ID—the bot joins as a participant in about 30 seconds once you send it from step 3.",
    },
    3: {
      title: "Language, pacing & launch",
      subtitle:
        "Send the Character into the meeting (Recall.ai), or preview the same session in your browser (OBS / virtual camera path).",
    },
  };

  const goNext = () =>
    setWizardStep((s) => (s < 3 ? ((s + 1) as WizardStep) : s));
  const goPrev = () => setWizardStep((s) => (s > 1 ? ((s - 1) as WizardStep) : s));

  const nextDisabled =
    (wizardStep === 1 && !canStart) ||
    (wizardStep === 2 && !step2CanProceed);

  const showWizard =
    (stage === "setup" || stage === "connecting") && !recallSessionId;

  return (
    <div className="min-h-screen bg-neutral-200 pb-24">
      <nav className="w-full px-4 md:px-8 py-4 md:py-5 flex items-center justify-between border-b border-neutral-300 backdrop-blur-sm">
        <div className="flex items-center gap-6 flex-wrap">
          <Link to="/" className="flex items-center gap-2 group">
            <ArrowLeft weight="fill" className="w-4 h-4 text-neutral-500 group-hover:text-neutral-900" />
            <span className="text-sm text-neutral-900 tracking-tight">Home</span>
          </Link>
          <Link
            to="/live"
            className="text-xs font-normal text-neutral-500 uppercase tracking-[0.15em] hover:text-neutral-900"
          >
            Advanced live controls
          </Link>
        </div>
      </nav>

      <div className="max-w-3xl mx-auto px-4 pt-10 pb-8">
        <span className="text-xs uppercase tracking-[0.2em] text-neutral-500">
          Meetings • Characters • Learner-first
        </span>
        <h1 className="mt-4 text-3xl md:text-5xl font-normal text-neutral-900 leading-[1.05] tracking-tight">
          Join class with a profile-tuned companion
        </h1>
        <p className="mt-4 text-base text-neutral-600 leading-relaxed max-w-2xl">
          Paste a meeting link and send a Runway Character as its own participant—or open the same learner-safe persona in the browser for a virtual-camera workflow.
        </p>
      </div>

      <div className="max-w-3xl mx-auto px-4 space-y-8">
        {recallSessionId && (
          <RecallSessionControls
            sessionId={recallSessionId}
            onClose={() => setRecallSessionId(null)}
          />
        )}

        <AnimatePresence mode="wait">
          {showWizard && (
            <motion.section
              key="wizard"
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -6 }}
              className="rounded-[2rem] bg-neutral-100/90 backdrop-blur-md border border-neutral-200 px-6 py-8 md:px-10 md:py-11 space-y-8"
            >
              {bridgeConfigured === false && (
                <div className="rounded-2xl border border-amber-200 bg-amber-50 px-5 py-3 text-sm text-amber-950 leading-snug">
                  <strong className="font-medium">Recall bridge not configured.</strong> Deploy the{" "}
                  <code className="text-[11px]">recall-bridge</code> Node service (see{" "}
                  <code className="text-[11px]">recall-bridge/README.md</code>), set{" "}
                  <code className="text-[11px]">PUBLIC_URL</code> there, then add{" "}
                  <code className="text-[11px]">RECALL_BRIDGE_URL</code> to Brainwave. Until then, use{" "}
                  <strong className="font-medium">Preview in browser</strong> below.
                </div>
              )}

              {error && (
                <div className="rounded-2xl border border-red-200 bg-red-50 px-5 py-3 text-sm text-red-700 leading-snug">
                  {error}
                </div>
              )}

              <div className="flex flex-wrap items-center gap-2 border-b border-neutral-200 pb-6">
                {([1, 2, 3] as const).map((n) => (
                  <button
                    key={n}
                    type="button"
                    onClick={() => setWizardStep(n)}
                    className={`rounded-full px-4 py-1.5 text-xs font-medium tracking-wide transition-colors ${
                      wizardStep === n
                        ? "bg-neutral-900 text-white"
                        : "bg-neutral-200/80 text-neutral-600 hover:bg-neutral-300/90"
                    }`}
                  >
                    Step {n}
                  </button>
                ))}
              </div>

              <div className="space-y-2">
                <h2 className="text-xl md:text-2xl font-normal text-neutral-900 tracking-tight">
                  {stepCopy[wizardStep].title}
                </h2>
                <p className="text-sm text-neutral-600 leading-relaxed max-w-2xl">
                  {stepCopy[wizardStep].subtitle}
                </p>
              </div>

              <AnimatePresence mode="wait">
                {wizardStep === 1 && (
                  <motion.div
                    key="step1"
                    initial={{ opacity: 0, x: -8 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: 8 }}
                    className="space-y-6"
                  >
                    <div className="flex flex-wrap gap-2">
                      {MEET_PROFILE_PRESETS.map((preset) => (
                        <button
                          key={preset.id}
                          type="button"
                          onClick={() => applyPreset(preset.profiles)}
                          className="rounded-full border border-neutral-300 bg-white px-4 py-2 text-left text-sm shadow-sm hover:border-neutral-400 hover:bg-neutral-50 transition-colors"
                        >
                          <span className="font-medium text-neutral-900">{preset.label}</span>
                          <span className="block text-xs text-neutral-500 mt-0.5">{preset.description}</span>
                        </button>
                      ))}
                    </div>
                    <ProfileSelector selected={selectedProfiles} onToggle={toggleProfile} />
                    {selectedProfiles.size === 0 && (
                      <p className="text-sm text-neutral-500 italic">
                        Choose a preset or select at least one profile to continue.
                      </p>
                    )}
                  </motion.div>
                )}

                {wizardStep === 2 && (
                  <motion.div
                    key="step2"
                    initial={{ opacity: 0, x: -8 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: 8 }}
                    className="space-y-6"
                  >
                    <div className="space-y-2">
                      <label htmlFor="meet-url" className="text-xs uppercase tracking-[0.15em] text-neutral-500">
                        Meeting URL
                      </label>
                      <input
                        id="meet-url"
                        type="url"
                        value={meetingUrl}
                        onChange={(e) => setMeetingUrl(e.target.value)}
                        placeholder="https://zoom.us/j/… or https://meet.google.com/…"
                        className="w-full rounded-2xl border border-neutral-300 bg-white px-4 py-3 text-sm text-neutral-900 placeholder:text-neutral-400 focus:border-neutral-500 focus:outline-none"
                      />
                      <p className="text-xs text-neutral-500">
                        Zoom, Google Meet, or Microsoft Teams invite links work.
                      </p>
                    </div>

                    <div className="space-y-2">
                      <label htmlFor="meet-pass" className="text-xs uppercase tracking-[0.15em] text-neutral-500">
                        Meeting password (optional)
                      </label>
                      <input
                        id="meet-pass"
                        type="text"
                        value={meetingPassword}
                        onChange={(e) => setMeetingPassword(e.target.value)}
                        placeholder="If the invite requires a password"
                        className="w-full rounded-2xl border border-neutral-300 bg-white px-4 py-3 text-sm text-neutral-900 placeholder:text-neutral-400 focus:border-neutral-500 focus:outline-none"
                      />
                    </div>

                    <div className="grid gap-4 sm:grid-cols-2">
                      <div className="space-y-2">
                        <span className="text-xs uppercase tracking-[0.15em] text-neutral-500">
                          Character type
                        </span>
                        <div className="flex rounded-2xl border border-neutral-300 bg-white p-1">
                          <button
                            type="button"
                            onClick={() => setAvatarKind("preset")}
                            className={`flex-1 rounded-xl py-2 text-sm font-medium transition-colors ${
                              avatarKind === "preset"
                                ? "bg-neutral-900 text-white"
                                : "text-neutral-600 hover:bg-neutral-100"
                            }`}
                          >
                            Preset
                          </button>
                          <button
                            type="button"
                            onClick={() => setAvatarKind("custom")}
                            className={`flex-1 rounded-xl py-2 text-sm font-medium transition-colors ${
                              avatarKind === "custom"
                                ? "bg-neutral-900 text-white"
                                : "text-neutral-600 hover:bg-neutral-100"
                            }`}
                          >
                            Custom ID
                          </button>
                        </div>
                      </div>

                      {avatarKind === "preset" ? (
                        <div className="space-y-2">
                          <label htmlFor="preset-char" className="text-xs uppercase tracking-[0.15em] text-neutral-500">
                            Preset character
                          </label>
                          <select
                            id="preset-char"
                            value={presetAvatarId}
                            onChange={(e) => setPresetAvatarId(e.target.value)}
                            className="w-full rounded-2xl border border-neutral-300 bg-white px-4 py-3 text-sm text-neutral-900 focus:border-neutral-500 focus:outline-none"
                          >
                            {RUNWAY_PRESET_CHARACTERS.map((p) => (
                              <option key={p.id} value={p.id}>
                                {p.label}
                              </option>
                            ))}
                          </select>
                        </div>
                      ) : (
                        <div className="space-y-2 sm:col-span-1">
                          <label htmlFor="custom-char" className="text-xs uppercase tracking-[0.15em] text-neutral-500">
                            Custom character ID
                          </label>
                          <input
                            id="custom-char"
                            type="text"
                            value={customAvatarId}
                            onChange={(e) => setCustomAvatarId(e.target.value)}
                            placeholder="UUID from Runway developer portal"
                            className="w-full rounded-2xl border border-neutral-300 bg-white px-4 py-3 text-sm text-neutral-900 placeholder:text-neutral-400 focus:border-neutral-500 focus:outline-none"
                          />
                          <p className="text-xs text-neutral-500">
                            Learner profile prompts apply via personality PATCH for custom characters.
                          </p>
                        </div>
                      )}
                    </div>

                    <div className="space-y-2">
                      <label htmlFor="bot-name" className="text-xs uppercase tracking-[0.15em] text-neutral-500">
                        Display name in meeting
                      </label>
                      <input
                        id="bot-name"
                        type="text"
                        value={botDisplayName}
                        onChange={(e) => setBotDisplayName(e.target.value)}
                        className="w-full rounded-2xl border border-neutral-300 bg-white px-4 py-3 text-sm text-neutral-900 focus:border-neutral-500 focus:outline-none"
                      />
                    </div>

                    <details className="rounded-2xl border border-neutral-200 bg-white/60 px-5 py-4">
                      <summary className="cursor-pointer text-sm font-medium text-neutral-900">
                        Alternative: virtual camera (host-only)
                      </summary>
                      <div className="mt-4 pt-2 border-t border-neutral-100">
                        <ZoomMeetHelp />
                      </div>
                    </details>
                  </motion.div>
                )}

                {wizardStep === 3 && (
                  <motion.div
                    key="step3"
                    initial={{ opacity: 0, x: -8 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: 8 }}
                    className="space-y-6"
                  >
                    <LanguageSelector
                      value={targetLanguage}
                      onChange={setTargetLanguage}
                      label="Companion language"
                    />
                    <details className="rounded-2xl border border-neutral-200 bg-white/60 px-5 py-4">
                      <summary className="cursor-pointer text-sm font-medium text-neutral-900">
                        Adjust pacing details (optional)
                      </summary>
                      <div className="mt-4 pt-2 border-t border-neutral-100">
                        <TransformConfig
                          selectedProfiles={selectedProfiles}
                          config={config}
                          onChange={updateConfig}
                        />
                        {selectedProfiles.size === 0 && (
                          <p className="text-sm text-neutral-500 italic mt-3">
                            Go back to step 1 to select profiles before tuning sliders.
                          </p>
                        )}
                      </div>
                    </details>
                    <p className="text-xs text-neutral-500 leading-relaxed">
                      <strong className="font-medium text-neutral-700">Send Character to Meeting</strong> uses Recall.ai
                      plus your <code className="text-[11px]">RUNWAYML_API_SECRET</code> on the server. Profile text is
                      sent as a personality override for <strong className="font-medium text-neutral-700">custom</strong>{" "}
                      characters only; presets keep Runway&apos;s built-in persona for realtime sessions (bridge logs a
                      note if you only selected presets).
                    </p>
                  </motion.div>
                )}
              </AnimatePresence>

              <div className="flex flex-col gap-4 pt-4 border-t border-neutral-200">
                <div className="flex flex-wrap items-center gap-2">
                  <motion.button
                    type="button"
                    whileHover={{ scale: wizardStep > 1 ? 1.02 : 1 }}
                    whileTap={{ scale: wizardStep > 1 ? 0.98 : 1 }}
                    onClick={goPrev}
                    disabled={wizardStep <= 1}
                    className="inline-flex items-center gap-1.5 rounded-full border border-neutral-300 bg-white px-4 py-2 text-sm text-neutral-800 disabled:opacity-35 disabled:pointer-events-none hover:bg-neutral-50"
                  >
                    <CaretLeft weight="bold" className="w-4 h-4" />
                    Back
                  </motion.button>
                  {wizardStep < 3 ? (
                    <motion.button
                      type="button"
                      whileHover={{ scale: nextDisabled ? 1 : 1.02 }}
                      whileTap={{ scale: nextDisabled ? 1 : 0.98 }}
                      onClick={goNext}
                      disabled={nextDisabled}
                      className="inline-flex items-center gap-1.5 rounded-full bg-neutral-900 px-4 py-2 text-sm text-white disabled:opacity-35 disabled:pointer-events-none hover:bg-neutral-800"
                    >
                      Next
                      <CaretRight weight="bold" className="w-4 h-4" />
                    </motion.button>
                  ) : null}
                </div>

                {wizardStep === 3 && (
                  <div className="flex flex-col sm:flex-row flex-wrap items-stretch sm:items-center gap-3 sm:justify-end">
                    <motion.button
                      type="button"
                      whileHover={{
                        scale:
                          bridgeConfigured && canStart && step2CanProceed && !recallStarting ? 1.03 : 1,
                      }}
                      whileTap={{
                        scale:
                          bridgeConfigured && canStart && step2CanProceed && !recallStarting ? 0.97 : 1,
                      }}
                      onClick={handleSendCharacterToMeeting}
                      disabled={
                        !bridgeConfigured ||
                        !canStart ||
                        !step2CanProceed ||
                        recallStarting
                      }
                      className="inline-flex justify-center items-center gap-2 rounded-full bg-neutral-900 disabled:opacity-40 disabled:pointer-events-none text-white px-8 py-3.5 text-[15px] font-normal shadow-xl order-1 sm:order-none"
                    >
                      {recallStarting ? (
                        <>
                          <CircleNotch weight="bold" className="w-4 h-4 animate-spin" />
                          Sending…
                        </>
                      ) : (
                        <>
                          <ArrowSquareOut weight="fill" className="w-4 h-4" />
                          Send Character to Meeting
                        </>
                      )}
                    </motion.button>

                    <motion.button
                      type="button"
                      whileHover={{ scale: canStart ? 1.02 : 1 }}
                      whileTap={{ scale: canStart ? 0.98 : 1 }}
                      onClick={handleStartSession}
                      disabled={!canStart || stage === "connecting"}
                      className="inline-flex justify-center items-center gap-2 rounded-full border border-neutral-400 bg-white text-neutral-900 disabled:opacity-40 disabled:pointer-events-none px-8 py-3.5 text-[15px] font-normal shadow-sm"
                    >
                      {stage === "connecting" ? (
                        <>
                          <CircleNotch weight="bold" className="w-4 h-4 animate-spin" />
                          Connecting…
                        </>
                      ) : (
                        <>
                          <ArrowSquareOut weight="fill" className="w-4 h-4" />
                          Preview in browser
                        </>
                      )}
                    </motion.button>
                  </div>
                )}
              </div>
            </motion.section>
          )}

          {stage === "session" && credentials && clientReady && (
            <motion.section
              key="session"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="rounded-[2rem] bg-neutral-100/90 backdrop-blur-md border border-neutral-200 px-4 py-6 md:px-8 md:py-10"
            >
              <AvatarSession
                credentials={credentials}
                audio
                video
                onEnd={() => {
                  setCredentials(null);
                  setStage("ended");
                }}
                onError={(err) => {
                  setError(err.message);
                  setCredentials(null);
                  setStage("setup");
                  setWizardStep(3);
                }}
              >
                <SessionView selectedProfiles={selectedProfiles} />
              </AvatarSession>
            </motion.section>
          )}

          {stage === "ended" && (
            <motion.section
              key="ended"
              initial={{ opacity: 0, scale: 0.98 }}
              animate={{ opacity: 1, scale: 1 }}
              className="rounded-[2rem] bg-neutral-100/90 backdrop-blur-md border border-neutral-200 px-8 py-12 text-center space-y-8"
            >
              <div className="space-y-4">
                <h2 className="text-3xl md:text-[2.3rem] text-neutral-900 tracking-tighter font-normal">
                  Session ended ✓
                </h2>
                <p className="text-[15px] text-neutral-700 leading-relaxed mx-auto max-w-md">
                  Recordings and transcripts live in the&nbsp;
                  <a
                    className="text-neutral-900 underline font-normal"
                    href="https://dev.runwayml.com"
                    target="_blank"
                    rel="noreferrer noopener"
                  >
                    Runway Developer Portal → Characters
                  </a>
                  .
                </p>
              </div>
              <motion.button
                whileHover={{ scale: 1.03 }}
                whileTap={{ scale: 0.97 }}
                onClick={resetWizardSession}
                className="inline-flex items-center gap-2 bg-neutral-900 text-white px-9 py-3 rounded-full text-sm shadow-lg"
              >
                Start another meeting setup
              </motion.button>
            </motion.section>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
