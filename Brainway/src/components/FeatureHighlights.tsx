import { motion } from "motion/react";
import { Link } from "@tanstack/react-router";
import { ArrowRight, Brain, Sparkle } from "@phosphor-icons/react";
import { LANDING_COLLABORATIONS } from "@/lib/landing-collaborations";

export default function FeatureHighlights() {
  return (
    <section className="w-full bg-[#f0f0f2] px-4 py-16 md:px-8 md:py-24">
      <div id="product" className="mx-auto grid max-w-6xl grid-cols-1 gap-4 md:gap-5 lg:grid-cols-12">
        <motion.article
          initial={{ opacity: 0, y: 24 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-80px" }}
          transition={{ duration: 0.55 }}
        className="relative overflow-hidden rounded-[2rem] bg-bw-lavender p-8 lg:col-span-6 md:p-10 md:min-h-[320px]"
        >
          <div className="relative z-10 max-w-md">
            <h2 className="text-3xl font-semibold tracking-tight text-neutral-950 md:text-4xl">
              Learning that stays gentle on working memory
            </h2>
            <p className="mt-4 text-sm leading-relaxed text-neutral-700 md:text-base">
              Brainway routes every source through a sensory scoring loop so pacing, contrast, and audio stay within
              ranges tuned for ADHD and autistic learners — without you hand-editing every cut.
            </p>
            <Link
              to="/create"
              className="mt-6 inline-flex items-center gap-2 text-sm font-medium text-neutral-950 underline decoration-neutral-400 underline-offset-4 hover:decoration-neutral-950"
            >
              Start from any PDF or link
              <ArrowRight className="h-4 w-4" weight="bold" />
            </Link>
          </div>
          <div
            className="pointer-events-none absolute -right-6 bottom-0 top-8 w-[55%] opacity-90 md:right-4 md:w-[48%]"
            aria-hidden
          >
            <div className="relative h-full w-full">
              <div className="absolute bottom-6 right-10 h-40 w-40 rounded-full bg-white/35 blur-2xl" />
              <div className="absolute bottom-10 right-0 flex h-52 w-52 items-center justify-center rounded-full bg-gradient-to-br from-violet-300/80 to-fuchsia-200/70 shadow-xl ring-4 ring-white/40">
                <Brain className="h-24 w-24 text-violet-700/90" weight="duotone" />
              </div>
              <div className="absolute bottom-0 right-32 h-36 w-36 rotate-6 rounded-[2rem] bg-gradient-to-tr from-violet-400/50 to-indigo-300/40 blur-[2px]" />
            </div>
          </div>
        </motion.article>

        <motion.article
          initial={{ opacity: 0, y: 24 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-80px" }}
          transition={{ duration: 0.55, delay: 0.05 }}
        className="flex flex-col justify-between rounded-[2rem] bg-bw-indigo p-8 text-white lg:col-span-3 md:min-h-[320px]"
        >
          <Sparkle className="h-7 w-7 text-white/90" weight="fill" />
          <div>
            <h3 className="text-2xl font-semibold tracking-tight">Always calm, always legible</h3>
            <p className="mt-3 text-sm leading-relaxed text-white/75 md:text-base">
              Captions lead the frame, motion is damped, and VO pacing stays steady so learners can predict what comes
              next.
            </p>
          </div>
        </motion.article>

        <motion.article
          initial={{ opacity: 0, y: 24 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-80px" }}
          transition={{ duration: 0.55, delay: 0.1 }}
        className="flex flex-col justify-between rounded-[2rem] bg-bw-indigo p-8 text-white lg:col-span-3 md:min-h-[280px]"
        >
          <div className="md:max-w-lg">
            <h3 className="text-2xl font-semibold tracking-tight">Fully automated refinement</h3>
            <p className="mt-3 text-sm leading-relaxed text-white/75 md:text-base">
              Drop a chapter, worksheet, or URL — the agentic loop scores sensory load, regenerates with Gen-4.5
              video, and ships a learner-safe cut you can preview in minutes.
            </p>
          </div>
          <div className="mt-6 flex items-center gap-3 md:mt-8">
            <div className="rounded-full bg-white/10 px-3 py-1.5 text-xs font-medium uppercase tracking-widest text-white/80">
              Live + batch
            </div>
            <Link
              to="/transform"
              className="inline-flex items-center gap-2 rounded-full border border-white/30 px-4 py-2 text-sm font-medium text-white hover:bg-white/10"
            >
              See transform
              <ArrowRight className="h-4 w-4" weight="bold" />
            </Link>
          </div>
        </motion.article>
      </div>

      <div className="mx-auto mt-10 hidden max-w-6xl flex-col gap-6 border-t border-neutral-300/80 pt-10 md:flex">
        <p className="max-w-xl text-sm text-neutral-600">
          Collaborations and cosigns appear on the home page below the live meeting section. Replace placeholder partner
          rows in code with your named programs as they land.
        </p>
        <div className="flex flex-wrap items-center gap-x-8 gap-y-3">
          {LANDING_COLLABORATIONS.map((c) =>
            c.href ? (
              <a
                key={c.name}
                href={c.href}
                target="_blank"
                rel="noopener noreferrer"
                className="text-xs font-semibold tracking-wide text-neutral-800 underline-offset-4 hover:underline"
              >
                {c.name}
              </a>
            ) : (
              <span key={c.name} className="text-xs font-semibold tracking-wide text-neutral-700">
                {c.name}
              </span>
            ),
          )}
        </div>
      </div>
    </section>
  );
}
