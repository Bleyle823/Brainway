import { motion } from "motion/react";
import { Link } from "@tanstack/react-router";
import { ChevronRight, ArrowUpRight, Wand2 } from "lucide-react";

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
        <span className="text-xl font-normal text-[#3b3a52] tracking-tight">CogniBridge</span>
      </div>

      <ul className="hidden md:flex items-center gap-6 lg:gap-8 bg-white/20 backdrop-blur-md border border-white/20 rounded-full px-6 py-2.5 text-sm text-[rgba(30,50,90,0.9)]">
        {menu.map((item) => (
          <li
            key={item.label}
            className="cursor-pointer hover:opacity-70 transition-opacity flex items-center gap-1 group"
          >
            {item.label}
            {item.hasDropdown && (
              <ChevronRight className="w-4 h-4 transition-transform group-hover:translate-x-0.5" />
            )}
          </li>
        ))}
      </ul>

      <div className="md:hidden text-xl font-normal text-[#3b3a52] tracking-tight">CogniBridge</div>

      <div className="flex-1 flex justify-end items-center gap-2 md:gap-3">
        <Link to="/transform">
          <motion.span
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            className="hidden md:flex items-center gap-1.5 text-sm text-[rgba(30,50,90,0.75)] hover:text-[#3b3a52] transition-colors cursor-pointer"
          >
            <Wand2 className="w-4 h-4" />
            Transform video
          </motion.span>
        </Link>
        <motion.button
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
          className="flex items-center bg-[rgba(30,50,90,0.8)] text-white rounded-full pl-2 pr-4 md:pr-6 py-1.5 md:py-2 gap-2 md:gap-3 hover:bg-[rgba(30,50,90,1)] transition-colors group"
        >
          <span className="bg-white/15 rounded-full p-1.5 md:p-2 flex items-center justify-center">
            <ArrowUpRight className="w-4 h-4 md:w-5 md:h-5 text-white" />
          </span>
          <span className="text-xs md:text-sm font-normal">Book Demo</span>
        </motion.button>
      </div>
    </nav>
  );
}
