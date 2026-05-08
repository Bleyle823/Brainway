import {
  Presentation,
  VideoCamera,
  ArrowsClockwise,
  Laptop,
  CaretDoubleDown,
} from "@phosphor-icons/react";

/**
 * Zoom and Google Meet do not expose a browser tab as your “webcam”.
 * Typical setup: OBS (or equivalent) captures this window/tab and exposes
 * a virtual camera participants can choose.
 */
export default function ZoomMeetHelp() {
  return (
    <div className="rounded-3xl bg-neutral-100/95 border border-neutral-300 px-6 py-5 text-sm text-neutral-800 space-y-4">
      <p className="text-xs uppercase tracking-[0.18em] text-neutral-600 flex items-center gap-2">
        <VideoCamera weight="fill" className="w-4 h-4" />
        Use with Zoom · Google Meet
      </p>
      <ul className="space-y-3 leading-relaxed text-neutral-700">
        <li className="flex gap-2">
          <Laptop weight="fill" className="w-5 h-5 shrink-0 mt-0.5 text-neutral-900" />
          <span>
            <strong>OBS Virtual Camera (recommended).</strong> Add a&nbsp;
            <em>Browser / Window Capture</em> pointing at CogniBridge, start{" "}
            <strong>OBS Virtual Camera</strong>. In Zoom or Meet, choose{" "}
            <strong>OBS Virtual Camera</strong> as your camera.
          </span>
        </li>
        <li className="flex gap-2">
          <ArrowsClockwise weight="fill" className="w-5 h-5 shrink-0 mt-0.5 text-neutral-900" />
          <span>
            Prefer no extra software? <strong>Share this browser tab/window</strong> and pin it
            in Meet—or use Slide / screen-share while learners watch the Avatar in parallel on
            their own devices.
          </span>
        </li>
        <li className="flex gap-2">
          <Presentation weight="fill" className="w-5 h-5 shrink-0 mt-0.5 text-neutral-900" />
          <span>
            Use <strong>Presentation mode</strong> on the video area for a cleaner capture rectangle in OBS.
          </span>
        </li>
      </ul>
      <details className="group border-t border-neutral-200 pt-3">
        <summary className="flex items-center gap-2 cursor-pointer list-none text-neutral-900 font-medium [&::-webkit-details-marker]:hidden">
          <CaretDoubleDown className="w-4 h-4 shrink-0 group-open:rotate-180 transition-transform" weight="fill" />
          Why not a built-in Zoom camera?
        </summary>
        <p className="mt-3 text-neutral-600 text-xs md:text-[13px] pl-7">
          Browsers cannot register as a native webcam driver for security reasons. OBS, mmhmm,
          or similar tools bridge CogniBridge’s video feed into Zoom/Meet exactly like a DSLR or
          USB camera.
        </p>
      </details>
    </div>
  );
}
