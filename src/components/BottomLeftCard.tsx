import { motion } from "motion/react";
import { Link } from "@tanstack/react-router";
import { ArrowUpRight } from "@phosphor-icons/react";

export default function BottomLeftCard() {
  return (
    <motion.div
      initial={{ x: -20, opacity: 0 }}
      animate={{ x: 0, opacity: 1 }}
      transition={{ duration: 0.8, delay: 0.2 }}
      className="absolute bottom-28 right-4 left-auto md:left-6 md:right-auto md:bottom-6 lg:bottom-10 lg:left-10 p-3 md:p-4 lg:p-5 rounded-3xl md:rounded-4xl lg:rounded-[2.2rem] bg-white/50 backdrop-blur-xl border border-neutral-300/50 flex flex-col gap-2 lg:gap-3 min-w-[140px] md:min-w-[150px] lg:min-w-[180px] w-fit"
    >
      <div className="flex flex-col">
        <span className="text-2xl md:text-3xl font-normal text-neutral-900 tracking-tight">
          1 in 7
        </span>
        <span className="text-[10px] md:text-[12px] font-normal text-neutral-600 uppercase tracking-wider">
          People are neurodivergent
        </span>
      </div>
      <Link to="/transform">
        <motion.span
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
          className="flex items-center bg-white rounded-full pl-1.5 pr-5 py-1.5 gap-2 hover:bg-neutral-100 transition-colors self-start group cursor-pointer"
        >
          <span className="bg-neutral-200 rounded-full p-1.5 flex items-center justify-center">
            <ArrowUpRight className="w-4 h-4 text-neutral-900" weight="fill" />
          </span>
          <span className="text-[14px] font-normal text-neutral-900">Try a Sample</span>
        </motion.span>
      </Link>
    </motion.div>
  );
}
