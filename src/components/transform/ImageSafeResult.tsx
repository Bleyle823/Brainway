import { ArrowCounterClockwise, DownloadSimple } from "@phosphor-icons/react";
import type { ProfileId } from "@/components/transform/ProfileSelector";

interface Props {
  /** Label for downloads / heading */
  label: string;
  originalPreviewUrl?: string | null;
  outputUrl: string | null;
  selectedProfiles: Set<ProfileId>;
  onReset: () => void;
}

const PROFILE_LABELS: Record<ProfileId, string> = {
  adhd: "ADHD",
  autism: "Autism-safe",
  dyslexia: "Dyslexia",
  sensory: "Sensory",
};

export default function ImageSafeResult({
  label,
  originalPreviewUrl,
  outputUrl,
  selectedProfiles,
  onReset,
}: Props) {
  const safeName = label.replace(/[^a-zA-Z0-9._-]+/g, "-").slice(0, 80) || "illustration";
  const downloadName = `brainwave-safe-${safeName}.png`;

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-normal text-neutral-900">Your neurodivergent-safe image</h2>
        <p className="mt-1 text-sm text-neutral-600">
          Generated with Brainwave accessibility rules for:{" "}
          {Array.from(selectedProfiles)
            .map((id) => PROFILE_LABELS[id])
            .join(", ") || "—"}
        </p>
      </div>

      {originalPreviewUrl && outputUrl ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <p className="text-xs uppercase tracking-wider text-neutral-500 mb-2">Reference</p>
            <div className="rounded-xl border border-neutral-200 overflow-hidden bg-neutral-100">
              <img
                src={originalPreviewUrl}
                alt="Reference"
                className="w-full h-auto object-contain max-h-80"
              />
            </div>
          </div>
          <div>
            <p className="text-xs uppercase tracking-wider text-neutral-500 mb-2">Safe output</p>
            <div className="rounded-xl border border-neutral-200 overflow-hidden bg-neutral-100">
              <img
                src={outputUrl}
                alt="Neurodivergent-safe illustration"
                className="w-full h-auto object-contain max-h-80"
              />
            </div>
          </div>
        </div>
      ) : outputUrl ? (
        <div className="rounded-xl border border-neutral-200 overflow-hidden bg-neutral-100">
          <img
            src={outputUrl}
            alt="Neurodivergent-safe illustration"
            className="w-full h-auto object-contain max-h-[28rem]"
          />
        </div>
      ) : (
        <p className="text-sm text-neutral-500">No image URL returned.</p>
      )}

      <div className="flex flex-wrap gap-3">
        {outputUrl ? (
          <a
            href={outputUrl}
            download={downloadName}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 rounded-full bg-neutral-900 text-white text-sm px-5 py-2.5 hover:bg-neutral-950 transition-colors"
          >
            <DownloadSimple className="w-4 h-4" weight="bold" />
            Download
          </a>
        ) : null}
        <button
          type="button"
          onClick={onReset}
          className="inline-flex items-center gap-2 rounded-full border border-neutral-300 bg-white text-neutral-900 text-sm px-5 py-2.5 hover:bg-neutral-50 transition-colors"
        >
          <ArrowCounterClockwise className="w-4 h-4" />
          Start over
        </button>
      </div>
    </div>
  );
}
