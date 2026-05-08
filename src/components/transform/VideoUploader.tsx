import { useState, useRef, useCallback } from "react";
import { motion, AnimatePresence } from "motion/react";
import { Upload, Link2, X, Play, Film } from "lucide-react";

type UploadMode = "file" | "url";

export interface VideoInfo {
  name: string;
  size?: string;
  /** MIME type, e.g. "video/mp4" */
  type?: string;
  /** blob: object URL for local preview (revoke when no longer needed) */
  previewUrl?: string;
  /** Public HTTPS URL when the user pasted a URL instead of uploading */
  externalUrl?: string;
  /** Original File object — available for file uploads, used for Runway upload */
  file?: File;
  /** Raw byte size — used to decide upload strategy */
  sizeBytes?: number;
}

interface Props {
  video: VideoInfo | null;
  onVideoReady: (video: VideoInfo) => void;
  onClear: () => void;
}

export default function VideoUploader({ video, onVideoReady, onClear }: Props) {
  const [mode, setMode] = useState<UploadMode>("file");
  const [isDragging, setIsDragging] = useState(false);
  const [urlInput, setUrlInput] = useState("");
  const [urlError, setUrlError] = useState("");
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFile = useCallback(
    (file: File) => {
      if (!file.type.startsWith("video/")) return;
      const bytes = file.size;
      const size =
        bytes > 1024 * 1024
          ? `${(bytes / (1024 * 1024)).toFixed(1)} MB`
          : `${(bytes / 1024).toFixed(0)} KB`;
      const previewUrl = URL.createObjectURL(file);
      onVideoReady({
        name: file.name,
        size,
        type: file.type,
        previewUrl,
        file,
        sizeBytes: file.size,
      });
    },
    [onVideoReady],
  );

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setIsDragging(false);
      const file = e.dataTransfer.files[0];
      if (file) handleFile(file);
    },
    [handleFile],
  );

  const handleUrlSubmit = () => {
    const trimmed = urlInput.trim();
    if (!trimmed) {
      setUrlError("Please enter a URL");
      return;
    }
    if (!trimmed.match(/^https?:\/\//)) {
      setUrlError("Enter a valid URL starting with https://");
      return;
    }
    setUrlError("");
    const parts = trimmed.split("/");
    const name = parts[parts.length - 1]?.split("?")[0] || "video.mp4";
    onVideoReady({ name, externalUrl: trimmed });
  };

  if (video) {
    return (
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        className="rounded-[1.5rem] bg-white/70 backdrop-blur-sm border border-white/60 overflow-hidden"
      >
        <div className="p-4 flex items-center gap-4">
          <div className="w-20 h-14 rounded-xl bg-[rgba(30,50,90,0.06)] border border-[rgba(30,50,90,0.08)] flex items-center justify-center shrink-0 overflow-hidden">
            {video.previewUrl ? (
              <video
                src={video.previewUrl}
                className="w-full h-full object-cover"
                muted
              />
            ) : (
              <Play className="w-5 h-5 text-[rgba(30,50,90,0.4)]" />
            )}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm text-[#3b3a52] truncate font-normal">{video.name}</p>
            {video.size && (
              <p className="text-xs text-[rgba(30,50,90,0.45)] mt-0.5">{video.size}</p>
            )}
            {video.externalUrl && (
              <p className="text-xs text-[rgba(30,50,90,0.45)] mt-0.5 truncate">
                {video.externalUrl}
              </p>
            )}
          </div>
          <div className="flex items-center gap-1 shrink-0">
            <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-[rgba(60,130,80,0.08)] border border-[rgba(60,130,80,0.2)]">
              <div className="w-1.5 h-1.5 rounded-full bg-[rgba(60,130,80,0.8)]" />
              <span className="text-xs text-[rgba(40,110,60,0.9)]">Ready</span>
            </div>
            <button
              onClick={onClear}
              className="p-2 rounded-full hover:bg-[rgba(30,50,90,0.06)] transition-colors ml-1"
              aria-label="Remove video"
            >
              <X className="w-4 h-4 text-[rgba(30,50,90,0.4)]" />
            </button>
          </div>
        </div>
      </motion.div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex bg-white/50 rounded-full p-1 border border-white/50 w-fit">
        {(["file", "url"] as UploadMode[]).map((m) => (
          <button
            key={m}
            onClick={() => setMode(m)}
            className={`px-5 py-1.5 rounded-full text-sm transition-all duration-200 ${
              mode === m
                ? "bg-[#3b3a52] text-white shadow-sm"
                : "text-[rgba(30,50,90,0.55)] hover:text-[#3b3a52]"
            }`}
          >
            {m === "file" ? "Upload file" : "Paste URL"}
          </button>
        ))}
      </div>

      <AnimatePresence mode="wait">
        {mode === "file" ? (
          <motion.div
            key="file"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.15 }}
            onDragOver={(e) => {
              e.preventDefault();
              setIsDragging(true);
            }}
            onDragLeave={() => setIsDragging(false)}
            onDrop={handleDrop}
            onClick={() => fileInputRef.current?.click()}
            className={`relative rounded-[1.5rem] border-2 border-dashed cursor-pointer transition-all duration-200 ${
              isDragging
                ? "border-[#3b3a52] bg-[rgba(59,58,82,0.04)]"
                : "border-[rgba(30,50,90,0.18)] bg-white/40 hover:bg-white/65 hover:border-[rgba(30,50,90,0.32)]"
            }`}
          >
            <input
              ref={fileInputRef}
              type="file"
              accept="video/*"
              className="hidden"
              onChange={(e) => {
                const f = e.target.files?.[0];
                if (f) handleFile(f);
              }}
            />
            <div className="py-16 px-8 flex flex-col items-center text-center gap-4">
              <div className="w-14 h-14 rounded-2xl bg-[rgba(30,50,90,0.05)] border border-[rgba(30,50,90,0.08)] flex items-center justify-center">
                {isDragging ? (
                  <Film className="w-6 h-6 text-[#3b3a52]" />
                ) : (
                  <Upload className="w-6 h-6 text-[rgba(30,50,90,0.5)]" />
                )}
              </div>
              <div>
                <p className="text-sm text-[#3b3a52]">
                  {isDragging
                    ? "Drop to upload"
                    : "Drop your video here, or "}
                  {!isDragging && (
                    <span className="underline underline-offset-2">browse files</span>
                  )}
                </p>
                <p className="text-xs text-[rgba(30,50,90,0.4)] mt-1.5">
                  MP4, MOV, AVI, MKV, WebM — up to 2 GB
                </p>
              </div>
            </div>
          </motion.div>
        ) : (
          <motion.div
            key="url"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.15 }}
            className="rounded-[1.5rem] bg-white/50 border border-white/50 p-6 space-y-4"
          >
            <div>
              <label className="text-xs uppercase tracking-[0.15em] text-[rgba(30,50,90,0.5)]">
                Video URL
              </label>
              <div className="mt-3 flex gap-3">
                <div className="flex-1 flex items-center gap-2.5 bg-white/70 border border-white/60 rounded-full px-4 py-2.5">
                  <Link2 className="w-4 h-4 text-[rgba(30,50,90,0.35)] shrink-0" />
                  <input
                    type="url"
                    value={urlInput}
                    onChange={(e) => {
                      setUrlInput(e.target.value);
                      setUrlError("");
                    }}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") handleUrlSubmit();
                    }}
                    placeholder="https://youtube.com/watch?v=…"
                    className="flex-1 bg-transparent text-sm text-[#3b3a52] placeholder:text-[rgba(30,50,90,0.3)] outline-none"
                  />
                </div>
                <button
                  onClick={handleUrlSubmit}
                  className="bg-[#3b3a52] text-white text-sm rounded-full px-5 py-2.5 hover:bg-[#2d2c44] transition-colors shrink-0"
                >
                  Add
                </button>
              </div>
              {urlError && (
                <p className="text-xs text-red-500 mt-2 px-1">{urlError}</p>
              )}
            </div>
            <p className="text-xs text-[rgba(30,50,90,0.4)]">
              Must be a direct .mp4 / .mov / .webm link (not YouTube / Vimeo). Ensure the URL is publicly accessible.
            </p>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
