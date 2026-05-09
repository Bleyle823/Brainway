import { motion } from "motion/react";
import { Link } from "@tanstack/react-router";
import {
  CaretRight,
  ArrowUpRight,
  MagicWand,
  VideoCamera,
  Sparkle,
  Books,
  Image as ImageIcon,
  SpeakerHigh,
} from "@phosphor-icons/react";

const menu = [
  { label: "Product" },
  { label: "For Educators", hasDropdown: true },
  { label: "Research" },
  { label: "Pricing", hasDropdown: true },
];

export default function Navbar() {
  return (
    <nav className="absolute top-0 left-0 right-0 z-20 flex items-center justify-between px-4 md:px-8 py-4 md:py-6">
      <div className="hidden md:block flex-1">
        <span className="text-xl font-normal text-neutral-900 tracking-tight">Brainwave</span>
      </div>

      <ul className="hidden md:flex items-center gap-6 lg:gap-8 bg-white/40 backdrop-blur-md border border-neutral-300/60 rounded-full px-6 py-2.5 text-sm text-neutral-800">
        {menu.map((item) => (
          <li
            key={item.label}
            className="cursor-pointer hover:opacity-70 transition-opacity flex items-center gap-1 group"
          >
            {item.label}
            {item.hasDropdown && (
              <CaretRight className="w-4 h-4 transition-transform group-hover:translate-x-0.5" weight="fill" />
            )}
          </li>
        ))}
      </ul>

      <div className="md:hidden text-xl font-normal text-neutral-900 tracking-tight">Brainwave</div>

      <div className="flex-1 flex justify-end items-center gap-2 md:gap-3">
        <Link to="/create">
          <motion.span
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            className="hidden md:flex items-center gap-1.5 text-sm text-neutral-700 hover:text-neutral-900 transition-colors cursor-pointer"
          >
            <Sparkle className="w-4 h-4" weight="fill" />
            Create
          </motion.span>
        </Link>
        <Link to="/community">
          <motion.span
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            className="hidden md:flex items-center gap-1.5 text-sm text-neutral-700 hover:text-neutral-900 transition-colors cursor-pointer"
          >
            <Books className="w-4 h-4" weight="duotone" />
            Safe library
          </motion.span>
        </Link>
        <Link to="/live">
          <motion.span
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            className="hidden md:flex items-center gap-1.5 text-sm text-neutral-700 hover:text-neutral-900 transition-colors cursor-pointer"
          >
            <VideoCamera className="w-4 h-4" weight="fill" />
            Live
          </motion.span>
        </Link>
        <Link to="/transform">
          <motion.span
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            className="hidden md:flex items-center gap-1.5 text-sm text-neutral-700 hover:text-neutral-900 transition-colors cursor-pointer"
          >
            <MagicWand className="w-4 h-4" weight="fill" />
            Transform
          </motion.span>
        </Link>
        <Link to="/transform" search={{ tab: "image" }}>
          <motion.span
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            className="hidden md:flex items-center gap-1.5 text-sm text-neutral-700 hover:text-neutral-900 transition-colors cursor-pointer"
          >
            <ImageIcon className="w-4 h-4" weight="fill" />
            Safe images
          </motion.span>
        </Link>
        <Link to="/transform" search={{ tab: "audio" }}>
          <motion.span
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            className="hidden md:flex items-center gap-1.5 text-sm text-neutral-700 hover:text-neutral-900 transition-colors cursor-pointer"
          >
            <SpeakerHigh className="w-4 h-4" weight="fill" />
            Safe audio
          </motion.span>
        </Link>
        <motion.button
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
          className="flex items-center bg-neutral-900 text-white rounded-full pl-2 pr-4 md:pr-6 py-1.5 md:py-2 gap-2 md:gap-3 hover:bg-neutral-800 transition-colors group"
        >
          <span className="bg-white/15 rounded-full p-1.5 md:p-2 flex items-center justify-center">
            <ArrowUpRight className="w-4 h-4 md:w-5 md:h-5 text-white" weight="fill" />
          </span>
          <span className="text-xs md:text-sm font-normal">Book Demo</span>
        </motion.button>
      </div>
    </nav>
  );
}
