import { motion } from "motion/react";
import { ArrowSquareOut } from "@phosphor-icons/react";
import { BRAND_KIT_FIGMA_URL } from "@/lib/brand-kit";

export default function BrandKitCallout() {
  return (
    <section className="w-full px-2 md:px-3 pb-2 md:pb-3 bg-white">
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true, margin: "-80px" }}
        transition={{ duration: 0.5 }}
        className="w-full rounded-2xl md:rounded-3xl border border-neutral-200 bg-neutral-50 px-6 md:px-10 py-6 md:py-8 flex flex-col md:flex-row md:items-center md:justify-between gap-5"
      >
        <div className="max-w-xl">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-neutral-500 mb-2">
            Brand kit
          </p>
          <p className="text-base md:text-lg text-neutral-800 leading-snug font-normal">
            Building something with Brainway or sharing our story? Open the{" "}
            <span className="text-neutral-950">Figma guidelines</span> for logos,
            colours, typography, and slide layouts.
          </p>
        </div>
        <a
          href={BRAND_KIT_FIGMA_URL}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex shrink-0 items-center justify-center gap-2 rounded-full bg-neutral-950 text-white px-6 py-3 text-sm font-normal hover:bg-neutral-800 transition-colors"
        >
          Explore brand kit
          <ArrowSquareOut className="w-4 h-4" weight="bold" aria-hidden />
        </a>
      </motion.div>
    </section>
  );
}
