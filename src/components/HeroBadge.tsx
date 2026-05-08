import { motion } from "motion/react";
import { Lightning } from "@phosphor-icons/react";

export default function HeroBadge() {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.6, ease: "easeOut" }}
      className="flex items-center gap-2 px-4 py-2 rounded-full bg-white/70 backdrop-blur-md border border-neutral-300/60 mx-auto mb-3 w-fit"
    >
      <Lightning className="w-4 h-4 text-neutral-900" weight="fill" />
      <span className="text-sm font-normal text-neutral-900">Powered by Gen-4.5 Video</span>
    </motion.div>
  );
}
