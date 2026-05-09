import { useRef, useState, useEffect, useCallback } from "react";
import { AvatarVideo, ControlBar, ScreenShareVideo } from "@runwayml/avatars-react";
import { CircleNotch, ArrowsOutSimple, ArrowsInSimple } from "@phosphor-icons/react";
import ZoomMeetHelp from "@/components/live/ZoomMeetHelp";
import { PROFILES, type ProfileId } from "@/components/transform/ProfileSelector";

interface Props {
  selectedProfiles: Set<ProfileId>;
}

/**
 * Lives inside `<AvatarSession>`. Displays remote avatar video, optional
 * local screen-share preview, and Brainwave media controls.
 */
export default function SessionView({ selectedProfiles }: Props) {
  const applied = PROFILES.filter((p) => selectedProfiles.has(p.id));
  const stageRef = useRef<HTMLDivElement>(null);
  const [isFs, setIsFs] = useState(false);

  useEffect(() => {
    const sync = () => setIsFs(!!document.fullscreenElement && document.fullscreenElement === stageRef.current);
    document.addEventListener("fullscreenchange", sync);
    return () => document.removeEventListener("fullscreenchange", sync);
  }, []);

  const togglePresentation = useCallback(async () => {
    const el = stageRef.current;
    if (!el) return;
    try {
      if (!document.fullscreenElement) await el.requestFullscreen();
      else await document.exitFullscreen();
    } catch {
      /* fullscreen may be denied */
    }
  }, []);

  return (
    <div className="flex flex-col gap-6 w-full">
      <ZoomMeetHelp />

      <div
        ref={stageRef}
        className={`relative rounded-3xl bg-neutral-200 border border-neutral-300 overflow-hidden min-h-[50vh] md:min-h-[60vh] ${
          isFs ? "rounded-none border-0" : ""
        }`}
      >
        <button
          type="button"
          onClick={togglePresentation}
          className="absolute top-14 right-4 z-30 flex items-center gap-2 rounded-full bg-neutral-950/85 text-neutral-50 text-xs px-3 py-2 border border-neutral-700 shadow-lg hover:bg-neutral-900 transition-colors"
        >
          {isFs ? (
            <ArrowsInSimple weight="fill" className="w-4 h-4" aria-hidden />
          ) : (
            <ArrowsOutSimple weight="fill" className="w-4 h-4" aria-hidden />
          )}
          {isFs ? "Exit presentation" : "Presentation mode"}
        </button>

        <AvatarVideo className="w-full h-full min-h-[50vh] object-cover bg-black/10" />

        <div className="absolute bottom-24 right-4 w-[38%] max-w-sm aspect-video rounded-2xl overflow-hidden border border-neutral-400 shadow-lg bg-black">
          <ScreenShareVideo className="w-full h-full object-contain bg-black">
            {(state) =>
              state.isSharing ? null : (
                <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 text-[11px] text-white/65 px-3 text-center bg-black/65">
                  <CircleNotch className="w-5 h-5 animate-spin opacity-80" weight="bold" aria-hidden />
                  <span>Use “Share screen” below to mirror instructor slides.</span>
                </div>
              )}
          </ScreenShareVideo>
        </div>

        {applied.length > 0 && (
          <div className="absolute top-4 left-4 flex flex-wrap gap-1.5 max-w-[min(90%,520px)]">
            {applied.map((p) => (
              <span
                key={p.id}
                className="text-[10px] px-2.5 py-1 rounded-full border backdrop-blur-sm bg-neutral-100/95"
                style={{
                  borderColor: p.accentBorder,
                  color: p.accentTag,
                  backgroundColor: p.accentBg,
                }}
              >
                {p.label}
              </span>
            ))}
          </div>
        )}
      </div>

      <ControlBar
        className="rounded-full bg-neutral-900 px-4 py-3 flex items-center justify-center gap-2 text-neutral-50 shadow-lg border border-neutral-950"
        showMicrophone
        showCamera={false}
        showScreenShare
        showEndCall
      />

      <p className="text-xs text-neutral-500 leading-relaxed px-2 text-center">
        Screen share mirrors your instructor visuals for the learner-safe avatar.&nbsp;
        <span className="font-normal text-neutral-600">
          Custom voices + screen share restrictions may apply per Runway account type.
        </span>
      </p>
    </div>
  );
}
