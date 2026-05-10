import { useCallback, useEffect, useState } from "react";
import { motion } from "motion/react";
import { CircleNotch, Microphone, MicrophoneSlash, StopCircle } from "@phosphor-icons/react";

import {
  recallGetSessionFn,
  recallMuteSessionFn,
  recallStopSessionFn,
  type RecallSessionPayload,
} from "@/lib/recall-meet-fns";

const STATUS_LABELS: Record<string, string> = {
  creating: "Creating Runway session…",
  polling: "Waiting for character…",
  consuming: "Getting connection details…",
  bot_joining: "Bot joining meeting (~30s)…",
  active: "Character is live in the meeting",
  failed: "Failed",
  ended: "Session ended",
};

interface Props {
  sessionId: string;
  /** After stop or when user dismisses a finished session. */
  onClose: () => void;
}

export default function RecallSessionControls({ sessionId, onClose }: Props) {
  const [payload, setPayload] = useState<RecallSessionPayload | null>(null);
  const [muted, setMuted] = useState(false);
  const [stopBusy, setStopBusy] = useState(false);

  const poll = useCallback(async () => {
    try {
      const next = await recallGetSessionFn({ data: { sessionId } });
      setPayload(next);
    } catch {
      /* transient */
    }
  }, [sessionId]);

  useEffect(() => {
    poll();
    const id = window.setInterval(poll, 1500);
    return () => window.clearInterval(id);
  }, [poll]);

  const status = payload?.status ?? "creating";
  const label = STATUS_LABELS[status] ?? status;
  const logs = payload?.logs ?? [];

  const dotClass =
    status === "active"
      ? "bg-emerald-500"
      : status === "failed"
        ? "bg-red-500"
        : status === "ended"
          ? "bg-neutral-400"
          : "bg-amber-400 animate-pulse";

  const toggleMute = async () => {
    const next = !muted;
    setMuted(next);
    try {
      await recallMuteSessionFn({ data: { sessionId, muted: next } });
    } catch {
      setMuted(!next);
    }
  };

  const stop = async () => {
    setStopBusy(true);
    try {
      await recallStopSessionFn({ data: { sessionId } });
      await poll();
    } finally {
      setStopBusy(false);
      onClose();
    }
  };

  return (
    <motion.section
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      className="rounded-[2rem] bg-neutral-100/90 backdrop-blur-md border border-neutral-200 px-6 py-8 md:px-10 md:py-10 space-y-6"
    >
      <div>
        <p className="text-xs uppercase tracking-[0.18em] text-neutral-500">Recall.ai bot</p>
        <h2 className="mt-2 text-xl font-normal text-neutral-900 tracking-tight">
          Character joining your Zoom / Meet / Teams link
        </h2>
      </div>

      <div className="flex items-center gap-3 rounded-2xl bg-neutral-200/80 border border-neutral-300 px-4 py-3">
        <span className={`h-2.5 w-2.5 shrink-0 rounded-full ${dotClass}`} aria-hidden />
        <span className="text-sm text-neutral-800">
          {label}
          {payload?.error ? ` — ${payload.error}` : ""}
        </span>
      </div>

      <div className="rounded-2xl bg-neutral-900/[0.04] border border-neutral-200 max-h-52 overflow-y-auto px-4 py-3 font-mono text-[11px] leading-relaxed text-neutral-600">
        {logs.length === 0 ? (
          <span className="text-neutral-400">Logs appear here…</span>
        ) : (
          logs.map((line, i) => (
            <div key={`${i}-${line.slice(0, 24)}`} className="whitespace-pre-wrap">
              {line}
            </div>
          ))
        )}
      </div>

      <div className="flex flex-wrap gap-3">
        <motion.button
          type="button"
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
          onClick={toggleMute}
          disabled={status !== "active"}
          className="inline-flex items-center gap-2 rounded-full border border-neutral-300 bg-white px-5 py-2.5 text-sm text-neutral-900 disabled:opacity-40"
        >
          {muted ? (
            <MicrophoneSlash weight="fill" className="w-4 h-4" />
          ) : (
            <Microphone weight="fill" className="w-4 h-4" />
          )}
          {muted ? "Unmute character" : "Mute character"}
        </motion.button>
        <motion.button
          type="button"
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
          onClick={stop}
          disabled={stopBusy}
          className="inline-flex items-center gap-2 rounded-full bg-red-600 text-white px-5 py-2.5 text-sm disabled:opacity-40"
        >
          {stopBusy ? (
            <CircleNotch weight="bold" className="w-4 h-4 animate-spin" />
          ) : (
            <StopCircle weight="fill" className="w-4 h-4" />
          )}
          End meeting bot
        </motion.button>
      </div>

      {(status === "failed" || status === "ended") && (
        <motion.button
          type="button"
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
          onClick={onClose}
          className="inline-flex items-center gap-2 rounded-full bg-neutral-900 text-white px-5 py-2.5 text-sm"
        >
          Back to setup
        </motion.button>
      )}

      <p className="text-xs text-neutral-500 leading-relaxed">
        The bot hears meeting audio and streams the Runway Character back as a participant. This uses your deployed recall-bridge service and Recall.ai billing (~see Recall pricing).
      </p>
    </motion.section>
  );
}
