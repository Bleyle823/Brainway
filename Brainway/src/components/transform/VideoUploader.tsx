import { useState, useRef, useCallback } from "react";

import { motion, AnimatePresence } from "motion/react";

import { UploadSimple, LinkSimple, X, Play, FilmStrip } from "@phosphor-icons/react";



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

        className="rounded-[1.5rem] bg-neutral-100 backdrop-blur-sm border border-neutral-200 overflow-hidden"

      >

        <div className="p-4 flex items-center gap-4">

          <div className="w-20 h-14 rounded-xl bg-neutral-100 border border-neutral-200 flex items-center justify-center shrink-0 overflow-hidden">

            {(video.previewUrl ?? video.externalUrl) ? (

              <video
                src={video.previewUrl ?? video.externalUrl}
                className="w-full h-full object-cover"
                muted
              />

            ) : (

              <Play className="w-5 h-5 text-neutral-400" weight="fill" />

            )}

          </div>

          <div className="flex-1 min-w-0">

            <p className="text-sm text-neutral-900 truncate font-normal">{video.name}</p>

            {video.size && <p className="text-xs text-neutral-500 mt-0.5">{video.size}</p>}

            {video.externalUrl && (

              <p className="text-xs text-neutral-500 mt-0.5 truncate">{video.externalUrl}</p>

            )}

          </div>

          <div className="flex items-center gap-1 shrink-0">

            <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-neutral-200 border border-neutral-300">

              <div className="w-1.5 h-1.5 rounded-full bg-neutral-800" />

              <span className="text-xs text-neutral-800">Ready</span>

            </div>

            <button

              onClick={onClear}

              className="p-2 rounded-full hover:bg-neutral-200 transition-colors ml-1"

              aria-label="Remove video"

            >

              <X className="w-4 h-4 text-neutral-500" weight="bold" />

            </button>

          </div>

        </div>

      </motion.div>

    );

  }



  return (

    <div className="space-y-4">

      <div className="flex bg-neutral-100 rounded-full p-1 border border-neutral-300 w-fit">

        {(["file", "url"] as UploadMode[]).map((m) => (

          <button

            key={m}

            onClick={() => setMode(m)}

            className={`px-5 py-1.5 rounded-full text-sm transition-all duration-200 ${

              mode === m

                ? "bg-neutral-900 text-neutral-50 shadow-sm"

                : "text-neutral-600 hover:text-neutral-900"

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

                ? "border-neutral-900 bg-neutral-200"

                : "border-neutral-300 bg-neutral-50 hover:bg-neutral-100 hover:border-neutral-400"

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

              <div className="w-14 h-14 rounded-2xl bg-neutral-100 border border-neutral-200 flex items-center justify-center">

                {isDragging ? (

                  <FilmStrip className="w-6 h-6 text-neutral-900" weight="fill" />

                ) : (

                  <UploadSimple className="w-6 h-6 text-neutral-600" weight="fill" />

                )}

              </div>

              <div>

                <p className="text-sm text-neutral-900">

                  {isDragging ? "Drop to upload" : "Drop your video here, or "}

                  {!isDragging && <span className="underline underline-offset-2">browse files</span>}

                </p>

                <p className="text-xs text-neutral-500 mt-1.5">MP4, MOV, AVI, MKV, WebM — up to 2 GB</p>

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

            className="rounded-[1.5rem] bg-neutral-100 border border-neutral-300 p-6 space-y-4"

          >

            <div>

              <label className="text-xs uppercase tracking-[0.15em] text-neutral-500">Video URL</label>

              <div className="mt-3 flex gap-3">

                <div className="flex-1 flex items-center gap-2.5 bg-neutral-50 border border-neutral-200 rounded-full px-4 py-2.5">

                  <LinkSimple className="w-4 h-4 text-neutral-500 shrink-0" weight="fill" />

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

                    className="flex-1 bg-transparent text-sm text-neutral-900 placeholder:text-neutral-400 outline-none"

                  />

                </div>

                <button

                  onClick={handleUrlSubmit}

                  className="bg-neutral-900 text-neutral-50 text-sm rounded-full px-5 py-2.5 hover:bg-neutral-800 transition-colors shrink-0"

                >

                  Add

                </button>

              </div>

              {urlError && <p className="text-xs text-red-600 mt-2 px-1">{urlError}</p>}

            </div>

            <p className="text-xs text-neutral-500">

              Must be a direct .mp4 / .mov / .webm link (not YouTube / Vimeo). Ensure the URL is publicly

              accessible.

            </p>

          </motion.div>

        )}

      </AnimatePresence>

    </div>

  );

}



