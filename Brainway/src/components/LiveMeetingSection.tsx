import { motion } from "motion/react";
import { Link } from "@tanstack/react-router";
import { ArrowRight, VideoCamera } from "@phosphor-icons/react";

export default function LiveMeetingSection() {
  return (
    <section className="w-full bg-[#fafafa] px-4 py-16 md:px-8 md:py-24 border-y border-neutral-200">
      <div className="mx-auto grid max-w-6xl gap-12 lg:grid-cols-2 lg:items-center lg:gap-16">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-80px" }}
          transition={{ duration: 0.55 }}
        >
          <p className="text-xs font-semibold uppercase tracking-[0.25em] text-neutral-500">
            Live classrooms
          </p>
          <h2 className="mt-4 text-4xl font-semibold tracking-tight text-neutral-950 md:text-5xl">
            Join the meeting—with a learner-safe Character beside instruction
          </h2>
          <p className="mt-5 max-w-xl text-base leading-relaxed text-neutral-600">
            Students join Zoom or Google Meet as they always do. The host launches Brainway, picks ADHD-aware, autism-safe, dyslexia-friendly, or sensory-calmed behavior presets, then pipes the avatar into the call using a virtual camera (for example OBS). Everyone sees the same class; the companion follows the predefined profile rules—not generic small talk.
          </p>
          <div className="mt-8 flex flex-col sm:flex-row flex-wrap gap-3">
            <Link
              to="/meet"
              className="inline-flex items-center justify-center gap-2 rounded-full bg-neutral-950 px-6 py-3 text-sm font-medium text-white transition hover:bg-neutral-800"
            >
              <VideoCamera className="h-4 w-4 shrink-0" weight="fill" />
              Start meeting setup
              <ArrowRight className="h-4 w-4 shrink-0" weight="bold" />
            </Link>
            <Link
              to="/live"
              className="inline-flex items-center justify-center rounded-full border border-neutral-300 bg-white px-6 py-3 text-sm font-medium text-neutral-800 transition hover:bg-neutral-50"
            >
              Advanced live controls
            </Link>
          </div>
          <p className="mt-4 text-xs text-neutral-500 max-w-lg">
            Deep link with selected profiles:{" "}
            <code className="rounded bg-neutral-200/80 px-1.5 py-0.5 text-[11px] text-neutral-800">
              /meet?profiles=adhd,sensory
            </code>
          </p>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 24 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-80px" }}
          transition={{ duration: 0.55, delay: 0.08 }}
          className="rounded-[2rem] border border-neutral-200 bg-white p-8 shadow-[0_24px_80px_-40px_rgba(15,23,42,0.25)] md:p-10"
        >
          <h3 className="text-lg font-semibold tracking-tight text-neutral-950">How it fits together</h3>
          <ol className="mt-6 space-y-4 text-sm leading-relaxed text-neutral-600">
            <li className="flex gap-3">
              <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-neutral-900 text-xs font-semibold text-white">
                1
              </span>
              <span>Open the guided wizard and choose presets that match your learners&apos; accommodations.</span>
            </li>
            <li className="flex gap-3">
              <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-neutral-900 text-xs font-semibold text-white">
                2
              </span>
              <span>Set up OBS or Meet layout so participants see instructor video and the calming Character feed.</span>
            </li>
            <li className="flex gap-3">
              <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-neutral-900 text-xs font-semibold text-white">
                3
              </span>
              <span>
                Start the session—Runway Characters runs with Brainway personality rules whenever your org uses a custom avatar (
                <code className="text-[11px] text-neutral-800">RUNWAY_CHARACTER_AVATAR_TYPE=custom</code>).
              </span>
            </li>
          </ol>
        </motion.div>
      </div>
    </section>
  );
}
