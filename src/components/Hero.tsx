import { motion } from "motion/react";
import Navbar from "./Navbar";
import HeroBadge from "./HeroBadge";
import BottomLeftCard from "./BottomLeftCard";
import BottomRightCorner from "./BottomRightCorner";
import heroImage from "@/assets/hero-cognibridge.png";

export default function Hero() {
  return (
    <section className="w-full min-h-screen p-2 md:p-3 bg-neutral-200">
      <div className="relative w-full h-[calc(100vh-1rem)] md:h-[calc(100vh-1.5rem)] rounded-3xl md:rounded-4xl overflow-hidden">
        <img
          src={heroImage}
          alt="Neurodivergent-friendly learning — abstract brain and cognition"
          width={1920}
          height={1080}
          className="absolute inset-0 w-full h-full object-cover object-center z-0 grayscale contrast-[1.03]"
        />

        <div className="relative z-10 w-full h-full flex flex-col">
          <Navbar />

          <div className="flex-1 flex items-center justify-center px-4 md:px-8 text-center">
            <div className="flex flex-col items-center max-w-3xl">
              <HeroBadge />
              <motion.h1
                initial={{ opacity: 0, scale: 0.98 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ duration: 0.8, delay: 0.2 }}
                className="text-4xl sm:text-5xl md:text-6xl lg:text-[80px] font-normal text-neutral-900 mb-3 tracking-tight leading-[1.05] drop-shadow-[0_1px_2px_rgba(255,255,255,0.8)]"
              >
                Learning that meets every mind
              </motion.h1>
              <motion.p
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ duration: 0.8, delay: 0.4 }}
                className="text-sm sm:text-base md:text-lg text-neutral-800/90 leading-relaxed max-w-xl font-normal drop-shadow-[0_1px_1px_rgba(255,255,255,0.7)]"
              >
                CogniBridge turns any document, link, or voice memo into calm, sensory-aware video tuned for ADHD and autistic learners.
              </motion.p>
            </div>
          </div>

          <BottomLeftCard />
          <BottomRightCorner />
        </div>
      </div>
    </section>
  );
}
