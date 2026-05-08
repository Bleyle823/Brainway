import { useState } from "react";
import { motion } from "motion/react";
import { Download, RefreshCw, RotateCcw, Play, CheckCircle2, ExternalLink } from "lucide-react";
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
      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div className="flex items-start gap-3">
          <div className="w-9 h-9 rounded-full bg-[rgba(52,120,68,0.1)] border border-[rgba(52,120,68,0.2)] flex items-center justify-center shrink-0 mt-0.5">
            <CheckCircle2 className="w-4.5 h-4.5 text-[rgba(52,120,68,0.9)]" />
          </div>
          <div>
            <h3 className="text-xl font-normal text-[#3b3a52] leading-tight">
              Transformation complete
            </h3>
            <p className="text-sm text-[rgba(30,50,90,0.55)] mt-0.5 truncate max-w-xs">
              {videoName}
            </p>
          </div>
        </div>
        <div
          className={`shrink-0 px-3 py-1.5 rounded-full text-xs border ${
            sssScore >= 80
              ? "bg-[rgba(52,120,68,0.08)] border-[rgba(52,120,68,0.22)] text-[rgba(36,100,52,0.9)]"
              : "bg-[rgba(194,122,14,0.08)] border-[rgba(194,122,14,0.22)] text-[rgba(154,92,4,0.9)]"
          }`}
        >
          SSS {sssScore}/100
        </div>
      </div>

      {/* Before / After toggle */}
      <div>
        <div className="flex bg-white/50 rounded-full p-1 border border-white/50 w-fit mb-4">
          {(["after", "before"] as const).map((t) => (
            <button
              key={t}
              onClick={() => setActiveTab(t)}
              className={`px-5 py-1.5 rounded-full text-sm transition-all duration-200 ${
                activeTab === t
                  ? "bg-[#3b3a52] text-white shadow-sm"
                  : "text-[rgba(30,50,90,0.55)] hover:text-[#3b3a52]"
              }`}
            >
              {t === "after" ? "Transformed" : "Original"}
            </button>
          ))}
        </div>

        <div className="relative rounded-[1.25rem] bg-[rgba(30,50,90,0.04)] border border-white/50 overflow-hidden aspect-video flex items-center justify-center">
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
                <div className="w-14 h-14 rounded-full bg-white/70 border border-white/60 flex items-center justify-center mx-auto">
                  <Play className="w-6 h-6 text-[rgba(30,50,90,0.5)]" />
                </div>
                <div>
                  <p className="text-sm text-[rgba(30,50,90,0.6)]">Original video</p>
                  <p className="text-xs text-[rgba(30,50,90,0.4)] mt-0.5">Standard format, unmodified</p>
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
                <div className="absolute inset-0 pointer-events-none bg-white/8 backdrop-saturate-75" />
              )}
              <div className="text-center space-y-4 relative z-10 px-6">
                <div className="w-14 h-14 rounded-full bg-[rgba(59,58,82,0.1)] border border-[rgba(59,58,82,0.15)] flex items-center justify-center mx-auto">
                  <Play className="w-6 h-6 text-[#3b3a52]" />
                </div>
                <div>
                  <p className="text-sm text-[#3b3a52]">Sensory-safe version</p>
                  <p className="text-xs text-[rgba(30,50,90,0.5)] mt-0.5">
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

      {/* Applied transformations list */}
      <div className="rounded-[1.25rem] bg-white/50 border border-white/50 px-5 py-4">
        <p className="text-xs uppercase tracking-[0.15em] text-[rgba(30,50,90,0.5)] mb-3">
          Applied transformations
        </p>
        <div className="grid sm:grid-cols-2 gap-x-6 gap-y-2">
          {allChanges.map(({ change, profile }) => (
            <div key={`${profile.id}-${change}`} className="flex items-center gap-2.5">
              <div
                className="w-1.5 h-1.5 rounded-full shrink-0"
                style={{ backgroundColor: profile.accentColor }}
              />
              <span className="text-sm text-[rgba(30,50,90,0.7)]">{change}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Actions */}
      <div className="flex flex-wrap gap-3">
        {outputUrl ? (
          <motion.a
            href={outputUrl}
            download={`cognibridge-${videoName}`}
            target="_blank"
            rel="noopener noreferrer"
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            className="flex-1 flex items-center justify-center gap-2.5 bg-[#2d2c44] text-white rounded-full px-6 py-3 hover:bg-[#1d1c34] transition-colors text-sm min-w-[180px]"
          >
            <Download className="w-4 h-4" />
            Download transformed video
          </motion.a>
        ) : (
          <motion.button
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            disabled
            className="flex-1 flex items-center justify-center gap-2.5 bg-[#2d2c44] text-white rounded-full px-6 py-3 transition-colors text-sm min-w-[180px] opacity-40 cursor-not-allowed"
          >
            <Download className="w-4 h-4" />
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
            className="flex items-center justify-center gap-2 bg-white/60 border border-white/55 text-[#3b3a52] rounded-full px-5 py-3 hover:bg-white/80 transition-colors text-sm"
          >
            <ExternalLink className="w-4 h-4" />
            Open in new tab
          </motion.a>
        )}

        <motion.button
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
          onClick={onReset}
          className="flex items-center justify-center gap-2 bg-white/50 border border-white/45 text-[rgba(30,50,90,0.6)] rounded-full px-5 py-3 hover:bg-white/70 transition-colors text-sm"
        >
          <RotateCcw className="w-4 h-4" />
          New video
        </motion.button>
      </div>

      {/* Runway attribution */}
      <p className="text-xs text-center text-[rgba(30,50,90,0.3)]">
        Powered by{" "}
        <a
          href="https://runwayml.com"
          target="_blank"
          rel="noopener noreferrer"
          className="underline underline-offset-2 hover:text-[rgba(30,50,90,0.55)] transition-colors"
        >
          Runway Gen-4 Aleph
        </a>
      </p>
    </motion.div>
  );
}
