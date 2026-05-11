import { motion } from "motion/react";
import Navbar from "./Navbar";
import { Play, ArrowRight, ArrowUpRight, GithubLogo, ChatCircleDots } from "@phosphor-icons/react";
import { Link } from "@tanstack/react-router";
import { PROJECT_GITHUB_URL, RUNWAY_HERMES_BOT_URL } from "@/lib/brand-kit";

export default function Hero() {
  return (
    <section className="w-full bg-white">
      <div className="max-w-7xl mx-auto px-4 md:px-8">
        <Navbar variant="marketing" />

        <div className="mt-6 grid lg:grid-cols-2 gap-10 items-center min-h-[calc(100vh-8rem)] py-12">
          <div className="flex flex-col gap-6">
            <div className="relative flex items-start gap-4">
              <div className="absolute -left-6 -top-6 h-36 w-36 rounded-full bg-gradient-to-br from-pink-300 to-violet-400 opacity-60 blur-3xl" />
            </div>

            <motion.h1
              initial={{ opacity: 0, y: 6 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.6 }}
              className="text-3xl md:text-4xl lg:text-5xl font-semibold text-neutral-950 tracking-tight leading-tight"
            >
              World-class AI learning video that empowers neurodivergent learners.
            </motion.h1>

            <div className="flex items-center gap-3">
              <button className="inline-flex items-center gap-2 rounded-full border border-neutral-300 px-3 py-1.5 text-sm font-medium text-neutral-800 hover:bg-neutral-50">
                <Play className="w-4 h-4" />
                How we work
              </button>
            </div>

            <div className="flex items-center gap-4 mt-2">
              <Link
                to="/create"
                className="inline-flex items-center bg-neutral-950 text-white rounded-full pl-2 pr-6 py-2 gap-3 hover:bg-neutral-800 transition-colors"
              >
                <span className="bg-white/15 rounded-full p-2 flex items-center justify-center">
                  <ArrowUpRight className="w-5 h-5" weight="fill" />
                </span>
                <span className="text-sm md:text-base font-normal">Contact us</span>
              </Link>
              <Link to="/create" className="text-sm underline decoration-neutral-300">
                Request a call
              </Link>
            </div>

            <div className="mt-5 flex flex-wrap items-center gap-x-6 gap-y-2 text-sm text-neutral-600">
              <a
                href={PROJECT_GITHUB_URL}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 font-medium text-neutral-800 underline decoration-neutral-300 underline-offset-4 hover:text-neutral-950 hover:decoration-neutral-950"
              >
                <GithubLogo className="h-5 w-5 shrink-0" weight="fill" aria-hidden />
                Project GitHub
              </a>
              <a
                href={RUNWAY_HERMES_BOT_URL}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 font-medium text-neutral-800 underline decoration-neutral-300 underline-offset-4 hover:text-neutral-950 hover:decoration-neutral-950"
              >
                <ChatCircleDots className="h-5 w-5 shrink-0" weight="fill" aria-hidden />
                Runway Hermes bot
              </a>
            </div>
          </div>

          <div className="grid gap-6">
            <div className="relative rounded-[2rem] min-h-[320px] shadow-lg overflow-hidden isolate flex flex-col justify-between p-6 text-white">
              <img
                src="/hero-calm-learning.png"
                alt="Smiling student in a calm school setting"
                className="absolute inset-0 h-full w-full object-cover object-[center_25%]"
                sizes="(min-width: 1024px) 42vw, 100vw"
                loading="lazy"
                decoding="async"
              />
              {/* Readability scrim — photo fills the card; no fill color peeks through */}
              <div
                className="absolute inset-0 bg-linear-to-t from-black/80 via-black/40 to-black/25 pointer-events-none"
                aria-hidden
              />

              <div className="relative z-10 flex flex-col justify-between gap-8 min-h-[260px]">
                <div>
                  <div className="text-sm uppercase tracking-wider bg-white/15 backdrop-blur-sm inline-block px-3 py-1 rounded-full border border-white/20">
                    Calm learning
                  </div>
                  <h3 className="mt-4 text-2xl font-semibold drop-shadow-sm">
                    Build calm, predictable learning at scale
                  </h3>
                  <p className="mt-2 text-sm text-white/95">
                    Tools and defaults tuned for attention and comprehension.
                  </p>
                </div>

                <div className="flex items-center justify-between gap-4">
                  <div className="text-sm underline decoration-white/60 underline-offset-4">Learn more</div>
                  <Link
                    to="/create"
                    className="inline-flex items-center justify-center h-10 w-10 rounded-full bg-white text-neutral-900 shadow-md shrink-0 hover:bg-white/95 transition-colors"
                  >
                    <ArrowRight className="w-4 h-4" />
                  </Link>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="rounded-[2rem] p-4 bg-neutral-200 text-neutral-900 shadow-sm border border-neutral-300">
                <div className="text-xs font-semibold uppercase text-neutral-600">Reach</div>
                <div className="mt-2 text-sm font-medium text-neutral-900">United neurodivergent learners</div>
              </div>
              <div className="rounded-[2rem] p-4 bg-neutral-200 text-neutral-900 shadow-sm border border-neutral-300">
                <div className="text-xs font-semibold uppercase text-neutral-600">Learners</div>
                <div className="mt-2 text-2xl font-bold text-neutral-900">1 in 7</div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
