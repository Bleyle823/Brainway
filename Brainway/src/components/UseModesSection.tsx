import { motion } from "motion/react";
import { Link } from "@tanstack/react-router";
import { ArrowRight, Buildings } from "@phosphor-icons/react";

export default function UseModesSection() {
  return (
    <section className="w-full bg-white px-4 py-16 md:px-8 md:py-24">
      <div className="mx-auto grid max-w-6xl gap-10 lg:grid-cols-2 lg:items-start lg:gap-16">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-80px" }}
          transition={{ duration: 0.55 }}
        >
          <p className="text-xs font-semibold uppercase tracking-[0.25em] text-neutral-500">Brainwave in practice</p>
          <h2 className="mt-4 text-4xl font-semibold tracking-tight text-neutral-950 md:text-5xl">Use modes</h2>
          <p className="mt-5 max-w-lg text-base leading-relaxed text-neutral-600">
            One pipeline powers classrooms, therapy platforms, async courses, and live Character sessions — each mode
            keeps the same sensory guardrails so learners get a consistent experience everywhere.
          </p>
        </motion.div>

        <motion.article
          initial={{ opacity: 0, y: 24 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-80px" }}
          transition={{ duration: 0.55, delay: 0.08 }}
          className="relative overflow-hidden rounded-[2rem] border border-neutral-200 bg-white p-8 shadow-[0_24px_80px_-40px_rgba(15,23,42,0.35)] md:p-10"
        >
          <div className="relative z-10 max-w-xl">
            <div className="inline-flex items-center gap-2 rounded-full bg-neutral-100 px-3 py-1 text-xs font-medium text-neutral-700">
              <Buildings className="h-4 w-4" weight="fill" />
              Classrooms & districts
            </div>
            <h3 className="mt-5 text-2xl font-semibold tracking-tight text-neutral-950 md:text-3xl">
              Ship accessible video without re-writing your curriculum
            </h3>
            <p className="mt-4 text-sm leading-relaxed text-neutral-600 md:text-base">
              Drop in existing PDFs and pacing guides. Brainwave outputs calm explainers, social stories, and chapter
              recaps that respect IEP accommodations by default.
            </p>
            <Link
              to="/community"
              className="mt-6 inline-flex items-center gap-2 text-sm font-semibold text-neutral-950 hover:gap-3 transition-all"
            >
              Know more
              <ArrowRight className="h-4 w-4" weight="bold" />
            </Link>
          </div>
          <div className="pointer-events-none relative mt-10 h-48 md:h-56" aria-hidden>
            <div className="absolute inset-x-4 bottom-0 flex justify-center">
              <div className="relative h-full w-full max-w-md">
                <div className="absolute inset-x-6 bottom-0 h-24 rounded-t-[2rem] bg-gradient-to-b from-violet-200/80 to-violet-400/40 blur-sm" />
                <div className="absolute inset-x-10 bottom-0 flex h-40 items-end justify-center gap-3">
                  <div className="h-32 w-10 rounded-t-lg bg-gradient-to-b from-violet-300 to-violet-500/80 shadow-lg" />
                  <div className="h-40 w-12 rounded-t-xl bg-gradient-to-b from-violet-200 to-violet-500 shadow-xl" />
                  <div className="h-32 w-10 rounded-t-lg bg-gradient-to-b from-violet-300 to-violet-500/80 shadow-lg" />
                  <div className="h-36 w-10 rounded-t-lg bg-gradient-to-b from-violet-200 to-violet-500/70 shadow-lg" />
                  <div className="h-32 w-10 rounded-t-lg bg-gradient-to-b from-violet-300 to-violet-500/80 shadow-lg" />
                </div>
              </div>
            </div>
          </div>
        </motion.article>
      </div>
    </section>
  );
}
