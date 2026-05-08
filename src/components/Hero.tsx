import { motion } from "motion/react";
import Navbar from "./Navbar";
import HeroBadge from "./HeroBadge";
import BottomLeftCard from "./BottomLeftCard";
import BottomRightCorner from "./BottomRightCorner";
import heroImage from "@/assets/hero-cognibridge.jpg";

export default function Hero() {
  return (
    <section className="w-full min-h-screen p-2 md:p-3 bg-[#f0f0f0]">
      <div className="relative w-full h-[calc(100vh-1rem)] md:h-[calc(100vh-1.5rem)] rounded-[1.5rem] md:rounded-[2rem] overflow-hidden">
        <img
          src={heroImage}
          alt="Calm abstract visual representing neurodivergent-friendly learning"
          width={1920}
          height={1080}
          className="absolute inset-0 w-full h-full object-cover object-center z-0"
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
                className="text-4xl sm:text-5xl md:text-6xl lg:text-[80px] font-normal text-[#3b3a52] mb-3 tracking-tight leading-[1.05]"
              >
                Learning that meets every mind
              </motion.h1>
              <motion.p
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ duration: 0.8, delay: 0.4 }}
                className="text-sm sm:text-base md:text-lg text-[#3b3a52] opacity-80 leading-relaxed max-w-xl font-normal"
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
