import { createFileRoute, Link } from "@tanstack/react-router";
import { motion, AnimatePresence } from "motion/react";
import { ArrowLeft, ArrowSquareOut, CircleNotch } from "@phosphor-icons/react";
import { AvatarSession } from "@runwayml/avatars-react";
import "@runwayml/avatars-react/styles.css";

import ProfileSelector from "@/components/transform/ProfileSelector";
import TransformConfig from "@/components/transform/TransformConfig";
import SessionView from "@/components/live/SessionView";
import LanguageSelector from "@/components/LanguageSelector";
import { useLiveCharacterSession } from "@/components/live/useLiveCharacterSession";

export const Route = createFileRoute("/live")({
  component: LiveCharactersPage,
  head: () => ({
    meta: [
      { title: "Live Session — Brainway" },
      {
        name: "description",
        content:
          "Real-time learner-safe Characters session—calm neurodiverse-first companion beside your lecture.",
      },
    ],
  }),
});

function LiveCharactersPage() {
  const {
    stage,
    setStage,
    selectedProfiles,
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

  return (
    <div className="min-h-screen bg-neutral-200 pb-24">
      <nav className="w-full px-4 md:px-8 py-4 md:py-5 flex items-center justify-between border-b border-neutral-300 backdrop-blur-sm">
        <div className="flex items-center gap-6">
          <Link to="/" className="flex items-center gap-2 group">
            <ArrowLeft weight="fill" className="w-4 h-4 text-neutral-500 group-hover:text-neutral-900" />
            <span className="text-sm text-neutral-900 tracking-tight">Home</span>
          </Link>
          <Link
            to="/transform"
            className="flex items-center gap-2 group text-xs font-normal text-neutral-500 uppercase tracking-[0.15em] hover:text-neutral-900"
          >
            Batch transform
          </Link>
        </div>
      </nav>

      <div className="max-w-3xl mx-auto px-4 pt-10 pb-16">
        <span className="text-xs uppercase tracking-[0.2em] text-neutral-500">
          Live Characters • GWM‑1 Avatars
        </span>
        <h1 className="mt-4 text-3xl md:text-5xl font-normal text-neutral-900 leading-[1.05] tracking-tight">
          Calm learner companion—
          <br />
          synced to instruction.
        </h1>
        <p className="mt-4 text-base text-neutral-600 leading-relaxed max-w-2xl">
          Share slides or demos for the Avatar to SEE while it speaks with you; its personality mirrors the class content but filters out overwhelm. Runway Characters API behind the scenes.
        </p>
      </div>

      <div className="max-w-3xl mx-auto px-4">
        <AnimatePresence mode="wait">
          {(stage === "setup" || stage === "connecting") && (
            <motion.section
              key="setup"
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -6 }}
              className="rounded-[2rem] bg-neutral-100/90 backdrop-blur-md border border-neutral-200 px-6 py-8 md:px-10 md:py-11 space-y-10"
            >
              {error && (
                <div className="rounded-2xl border border-red-200 bg-red-50 px-5 py-3 text-sm text-red-700 leading-snug">
                  {error}
                </div>
              )}

              <div className="space-y-6">
                <div>
                  <p className="text-xs uppercase tracking-[0.15em] text-neutral-500 mb-3">
                    Learner Profiles
                  </p>
                  <ProfileSelector selected={selectedProfiles} onToggle={toggleProfile} />
                </div>
                <div>
                  <p className="text-xs uppercase tracking-[0.15em] text-neutral-500 mb-3">
                    Fine Tune
                  </p>
                  <TransformConfig
                    selectedProfiles={selectedProfiles}
                    config={config}
                    onChange={updateConfig}
                  />
                  {selectedProfiles.size === 0 && (
                    <p className="text-sm text-neutral-500 italic mt-3">
                      Select at least one profile to specialise the companion persona.
                    </p>
                  )}
                </div>

                <div className="pt-4 border-t border-neutral-200">
                  <LanguageSelector
                    value={targetLanguage}
                    onChange={setTargetLanguage}
                    label="Companion language"
                  />
                  <p className="mt-2 text-xs text-neutral-500 max-w-sm">
                    Runway only accepts <code className="text-[11px]">personality</code> and{" "}
                    <code className="text-[11px]">startScript</code> for <strong className="font-medium text-neutral-700">custom</strong> avatars. Use{" "}
                    <code className="text-[11px]">RUNWAY_CHARACTER_AVATAR_TYPE=custom</code> plus your avatar ID in env for multilingual + profile-tuned sessions; preset avatars keep the built‑in persona.
                  </p>
                </div>
              </div>

              <div className="flex flex-col-reverse sm:flex-row items-stretch sm:items-center justify-between gap-4 pt-2">
                <Link
                  to="/transform"
                  className="text-sm text-neutral-600 underline-offset-4 hover:text-neutral-900 hover:underline"
                >
                  Prefer batch-processing a video →
                </Link>
                <motion.button
                  whileHover={{ scale: canStart ? 1.03 : 1 }}
                  whileTap={{ scale: canStart ? 0.97 : 1 }}
                  onClick={handleStartSession}
                  disabled={!canStart || stage === "connecting"}
                  className="inline-flex justify-center items-center gap-3 bg-neutral-900 disabled:opacity-40 disabled:pointer-events-none text-white px-10 py-3.5 rounded-full text-[15px] font-normal shadow-xl"
                >
                  {stage === "connecting" ? (
                    <>
                      <CircleNotch weight="bold" className="w-4 h-4 animate-spin" /> Starting session…
                    </>
                  ) : (
                    <>
                      <ArrowSquareOut weight="fill" className="w-4 h-4" />
                      Launch live learner companion
                    </>
                  )}
                </motion.button>
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
                  Session gracefully ended ✓
                </h2>
                <p className="text-[15px] text-neutral-700 leading-relaxed mx-auto max-w-md">
                  You can revisit your Character transcript/recording anytime in the&nbsp;
                  <a
                    className="text-neutral-900 underline font-normal"
                    href="https://dev.runwayml.com"
                    target="_blank"
                    rel="noreferrer noopener"
                  >
                    Runway Developer Portal → Characters tab
                  </a>
                  .
                </p>
              </div>
              <motion.button
                whileHover={{ scale: 1.03 }}
                whileTap={{ scale: 0.97 }}
                onClick={resetAll}
                className="inline-flex items-center gap-2 bg-neutral-900 text-white px-9 py-3 rounded-full text-sm shadow-lg"
              >
                Start another session
              </motion.button>
            </motion.section>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
