import { motion } from "motion/react";
import { ArrowUpRight, CaretRight } from "@phosphor-icons/react";

export default function BottomRightCorner() {
  return (
    <motion.div
      initial={{ y: 20, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ duration: 0.8, delay: 0.4 }}
      className="absolute bottom-0 right-0 p-3 pt-5 pl-8 sm:p-4 sm:pt-6 sm:pl-10 md:p-6 md:pt-8 md:pl-14 bg-neutral-200 rounded-tl-[1.5rem] sm:rounded-tl-[2rem] md:rounded-tl-[3.5rem] flex items-center gap-3 sm:gap-4 md:gap-6"
    >
      <div
        className="absolute -top-5 right-0 w-5 h-5 bg-neutral-200"
        style={{
          maskImage: "radial-gradient(circle at 0 100%, transparent 20px, black 20px)",
          WebkitMaskImage: "radial-gradient(circle at 0 100%, transparent 20px, black 20px)",
        }}
      />
      <div
        className="absolute bottom-0 -left-5 w-5 h-5 bg-neutral-200"
        style={{
          maskImage: "radial-gradient(circle at 100% 0, transparent 20px, black 20px)",
          WebkitMaskImage: "radial-gradient(circle at 100% 0, transparent 20px, black 20px)",
        }}
      />

      <div className="bg-neutral-300/70 w-12 h-12 md:w-16 md:h-16 rounded-full flex items-center justify-center border border-neutral-400/60">
        <ArrowUpRight className="w-6 h-6 md:w-7 md:h-7 text-neutral-900" weight="fill" />
      </div>

      <div className="flex flex-col">
        <span className="text-[18px] md:text-[24px] font-normal text-neutral-950">
          Documentation
        </span>
        <span className="flex items-center gap-1 text-[13px] md:text-[16px] font-normal text-neutral-600">
          Library
          <CaretRight className="w-3.5 h-3.5 md:w-4 md:h-4" weight="fill" />
        </span>
      </div>
    </motion.div>
  );
}
