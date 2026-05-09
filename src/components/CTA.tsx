import { motion } from "motion/react";
import { Link } from "@tanstack/react-router";
import { ArrowUpRight, MagicWand, VideoCamera, Sparkle } from "@phosphor-icons/react";

export default function CTA() {
  return (
    <section className="w-full px-2 md:px-3 pb-2 md:pb-3 bg-neutral-200">
      <div className="relative w-full rounded-3xl md:rounded-4xl overflow-hidden bg-gradient-to-br from-neutral-100 via-neutral-300/80 to-neutral-400 border border-neutral-400/70 px-6 md:px-16 py-20 md:py-32">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-100px" }}
          transition={{ duration: 0.7 }}
          className="max-w-3xl mx-auto text-center"
        >
          <h2 className="text-3xl md:text-5xl lg:text-[64px] font-normal text-neutral-950 leading-[1.05] tracking-tight">
            Build learning that doesn't burn out the learner.
          </h2>
          <p className="mt-5 text-base md:text-lg text-neutral-700 max-w-xl mx-auto">
            Get early access to Brainwave and convert your first source into a sensory-safe video this week.
          </p>
          <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
            <motion.button
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              className="inline-flex items-center bg-neutral-950 text-white rounded-full pl-2 pr-6 py-2 gap-3 hover:bg-neutral-800 transition-colors"
            >
              <span className="bg-white/15 rounded-full p-2 flex items-center justify-center">
                <ArrowUpRight className="w-5 h-5" weight="fill" />
              </span>
              <span className="text-sm md:text-base font-normal">Request access</span>
            </motion.button>

            <Link to="/create">
              <motion.span
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                className="inline-flex items-center bg-white/80 backdrop-blur-sm border border-neutral-400/70 text-neutral-950 rounded-full pl-2 pr-6 py-2 gap-3 hover:bg-white transition-colors cursor-pointer"
              >
                <span className="bg-neutral-200 rounded-full p-2 flex items-center justify-center">
                  <Sparkle className="w-5 h-5" weight="fill" />
                </span>
                <span className="text-sm md:text-base font-normal">Create educational video</span>
              </motion.span>
            </Link>

            <Link to="/live">
              <motion.span
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                className="inline-flex items-center bg-white/60 backdrop-blur-sm border border-neutral-400/60 text-neutral-950 rounded-full pl-2 pr-6 py-2 gap-3 hover:bg-white/80 transition-colors cursor-pointer"
              >
                <span className="bg-neutral-200/80 rounded-full p-2 flex items-center justify-center">
                  <VideoCamera className="w-5 h-5" weight="fill" />
                </span>
                <span className="text-sm md:text-base font-normal">Live Character session</span>
              </motion.span>
            </Link>

            <Link to="/transform">
              <motion.span
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                className="inline-flex items-center bg-white/50 backdrop-blur-sm border border-neutral-400/60 text-neutral-950 rounded-full pl-2 pr-6 py-2 gap-3 hover:bg-white/80 transition-colors cursor-pointer"
              >
                <span className="bg-neutral-200/90 rounded-full p-2 flex items-center justify-center">
                  <MagicWand className="w-5 h-5" weight="fill" />
                </span>
                <span className="text-sm md:text-base font-normal">Transform existing video</span>
              </motion.span>
            </Link>
          </div>
        </motion.div>
      </div>
    </section>
  );
}
