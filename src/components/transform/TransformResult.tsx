import { useState } from "react";
import { motion } from "motion/react";
import {
  DownloadSimple,
  ArrowCounterClockwise,
  Play,
  CheckCircle,
  ArrowSquareOut,
} from "@phosphor-icons/react";
import { type ProfileId, PROFILES } from "./ProfileSelector";

interface Props {
  videoName: string;
  /** blob: / https: URL of the original video for the "before" tab */
  originalPreviewUrl?: string;
  /** HTTPS URL of the Runway-generated output video */
  outputUrl?: string | null;
  selectedProfiles: Set<ProfileId>;
  sssScore: number;
  onReset: () => void;
}

export default function TransformResult({
  videoName,
  originalPreviewUrl,
  outputUrl,
  selectedProfiles,
  sssScore,
  onReset,
}: Props) {
  const [activeTab, setActiveTab] = useState<"after" | "before">("after");

  const appliedProfiles = PROFILES.filter((p) => selectedProfiles.has(p.id));
  const allChanges = appliedProfiles.flatMap((p) =>
    p.changes.map((c) => ({ change: c, profile: p })),
  );

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      className="space-y-6"
    >
      <div className="flex items-start justify-between gap-4">
        <div className="flex items-start gap-3">
          <div className="w-9 h-9 rounded-full bg-neutral-200 border border-neutral-300 flex items-center justify-center shrink-0 mt-0.5">
            <CheckCircle className="w-[18px] h-[18px] text-neutral-900" weight="fill" />
          </div>
          <div>
            <h3 className="text-xl font-normal text-neutral-900 leading-tight">Transformation complete</h3>
            <p className="text-sm text-neutral-600 mt-0.5 truncate max-w-xs">{videoName}</p>
          </div>
        </div>
        <div
          className={`shrink-0 px-3 py-1.5 rounded-full text-xs border ${
            sssScore >= 80
              ? "bg-neutral-50 border-neutral-800 text-neutral-900"
              : "bg-neutral-50 border-neutral-400 text-neutral-700"
          }`}
        >
          SSS {sssScore}/100
        </div>
      </div>

      <div>
        <div className="flex bg-neutral-100 rounded-full p-1 border border-neutral-300 w-fit mb-4">
          {(["after", "before"] as const).map((t) => (
            <button
              key={t}
              onClick={() => setActiveTab(t)}
              className={`px-5 py-1.5 rounded-full text-sm transition-all duration-200 ${
                activeTab === t
                  ? "bg-neutral-900 text-neutral-50 shadow-sm"
                  : "text-neutral-600 hover:text-neutral-900"
              }`}
            >
              {t === "after" ? "Transformed" : "Original"}
            </button>
          ))}
        </div>

        <div className="relative rounded-[1.25rem] bg-neutral-100 border border-neutral-200 overflow-hidden aspect-video flex items-center justify-center">
          {activeTab === "before" ? (
            originalPreviewUrl ? (
              <video
                key="before-video"
                src={originalPreviewUrl}
                controls
                className="w-full h-full object-contain"
                preload="metadata"
              />
            ) : (
              <div className="text-center space-y-3">
                <div className="w-14 h-14 rounded-full bg-neutral-200 border border-neutral-300 flex items-center justify-center mx-auto">
                  <Play className="w-6 h-6 text-neutral-500" weight="fill" />
                </div>
                <div>
                  <p className="text-sm text-neutral-600">Original video</p>
                  <p className="text-xs text-neutral-500 mt-0.5">Standard format, unmodified</p>
                </div>
              </div>
            )
          ) : outputUrl ? (
            <video
              key="after-video"
              src={outputUrl}
              controls
              autoPlay
              className="w-full h-full object-contain"
              preload="auto"
            />
          ) : (
            <div className="w-full h-full relative flex items-center justify-center">
              {selectedProfiles.has("sensory") && (
                <div className="absolute inset-0 pointer-events-none bg-neutral-100/90 backdrop-grayscale" />
              )}
              <div className="text-center space-y-4 relative z-10 px-6">
                <div className="w-14 h-14 rounded-full bg-neutral-200 border border-neutral-300 flex items-center justify-center mx-auto">
                  <Play className="w-6 h-6 text-neutral-900" weight="fill" />
                </div>
                <div>
                  <p className="text-sm text-neutral-900">Sensory-safe version</p>
                  <p className="text-xs text-neutral-500 mt-0.5">
                    {appliedProfiles.length} profile{appliedProfiles.length !== 1 ? "s" : ""} applied
                  </p>
                </div>
                <div className="flex flex-wrap justify-center gap-1.5">
                  {appliedProfiles.map((p) => (
                    <span
                      key={p.id}
                      className="text-xs px-2.5 py-1 rounded-full border"
                      style={{
                        backgroundColor: p.accentBg,
                        borderColor: p.accentBorder,
                        color: p.accentTag,
                      }}
                    >
                      {p.label}
                    </span>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      <div className="rounded-[1.25rem] bg-neutral-50 border border-neutral-200 px-5 py-4">
        <p className="text-xs uppercase tracking-[0.15em] text-neutral-500 mb-3">Applied transformations</p>
        <div className="grid sm:grid-cols-2 gap-x-6 gap-y-2">
          {allChanges.map(({ change, profile }) => (
            <div key={`${profile.id}-${change}`} className="flex items-center gap-2.5">
              <div
                className="w-1.5 h-1.5 rounded-full shrink-0"
                style={{ backgroundColor: profile.accentColor }}
              />
              <span className="text-sm text-neutral-700">{change}</span>
            </div>
          ))}
        </div>
      </div>

      <div className="flex flex-wrap gap-3">
        {outputUrl ? (
          <motion.a
            href={outputUrl}
            download={`brainwave-${videoName}`}
            target="_blank"
            rel="noopener noreferrer"
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            className="flex-1 flex items-center justify-center gap-2.5 bg-neutral-900 text-neutral-50 rounded-full px-6 py-3 hover:bg-neutral-800 transition-colors text-sm min-w-[180px]"
          >
            <DownloadSimple className="w-4 h-4" weight="fill" />
            Download transformed video
          </motion.a>
        ) : (
          <motion.button
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            disabled
            className="flex-1 flex items-center justify-center gap-2.5 bg-neutral-900 text-neutral-50 rounded-full px-6 py-3 transition-colors text-sm min-w-[180px] opacity-40 cursor-not-allowed"
          >
            <DownloadSimple className="w-4 h-4" weight="fill" />
            Download transformed video
          </motion.button>
        )}

        {outputUrl && (
          <motion.a
            href={outputUrl}
            target="_blank"
            rel="noopener noreferrer"
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            className="flex items-center justify-center gap-2 bg-neutral-100 border border-neutral-300 text-neutral-900 rounded-full px-5 py-3 hover:bg-neutral-200 transition-colors text-sm"
          >
            <ArrowSquareOut className="w-4 h-4" weight="fill" />
            Open in new tab
          </motion.a>
        )}

        <motion.button
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
          onClick={onReset}
          className="flex items-center justify-center gap-2 bg-neutral-50 border border-neutral-200 text-neutral-600 rounded-full px-5 py-3 hover:bg-neutral-100 transition-colors text-sm"
        >
          <ArrowCounterClockwise className="w-4 h-4" weight="fill" />
          New video
        </motion.button>
      </div>

      <p className="text-xs text-center text-neutral-500">
        Powered by{" "}
        <a
          href="https://runwayml.com"
          target="_blank"
          rel="noopener noreferrer"
          className="underline underline-offset-2 hover:text-neutral-600 transition-colors"
        >
          Runway Gen-4 Aleph
        </a>
      </p>
    </motion.div>
  );
}
