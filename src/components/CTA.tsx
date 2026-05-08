import { motion } from "motion/react";
import { Link } from "@tanstack/react-router";
import { ArrowUpRight, Wand2 } from "lucide-react";

export default function CTA() {
  return (
    <section className="w-full px-2 md:px-3 pb-2 md:pb-3 bg-[#f0f0f0]">
      <div className="relative w-full rounded-[1.5rem] md:rounded-[2rem] overflow-hidden bg-gradient-to-br from-[#cabfe0] via-[#d8d3c2] to-[#b8c8b1] px-6 md:px-16 py-20 md:py-32">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-100px" }}
          transition={{ duration: 0.7 }}
          className="max-w-3xl mx-auto text-center"
        >
          <h2 className="text-3xl md:text-5xl lg:text-[64px] font-normal text-[#2d2c44] leading-[1.05] tracking-tight">
            Build learning that doesn't burn out the learner.
          </h2>
          <p className="mt-5 text-base md:text-lg text-[rgba(45,44,68,0.7)] max-w-xl mx-auto">
            Get early access to CogniBridge and convert your first source into a sensory-safe video this week.
          </p>
          <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
            <motion.button
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              className="inline-flex items-center bg-[#2d2c44] text-white rounded-full pl-2 pr-6 py-2 gap-3 hover:bg-[#1d1c34] transition-colors"
            >
              <span className="bg-white/15 rounded-full p-2 flex items-center justify-center">
                <ArrowUpRight className="w-5 h-5" />
              </span>
              <span className="text-sm md:text-base font-normal">Request access</span>
            </motion.button>

            <Link to="/transform">
              <motion.span
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                className="inline-flex items-center bg-white/30 backdrop-blur-sm border border-white/50 text-[#2d2c44] rounded-full pl-2 pr-6 py-2 gap-3 hover:bg-white/50 transition-colors cursor-pointer"
              >
                <span className="bg-white/40 rounded-full p-2 flex items-center justify-center">
                  <Wand2 className="w-5 h-5" />
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
