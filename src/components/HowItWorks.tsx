import { motion } from "motion/react";
import { FileText, Sparkle, PlayCircle } from "@phosphor-icons/react";

const steps = [
  {
    icon: FileText,
    step: "01",
    title: "Drop in any source",
    body: "PDF, URL, or a voice memo. Course chapters, IEP goals, therapy worksheets — Brainwave ingests it all.",
  },
  {
    icon: Sparkle,
    step: "02",
    title: "Agentic loop tunes the output",
    body: "Our model generates a Gen-4.5 video, scores its sensory load, and re-renders until pacing and stimulation pass threshold.",
  },
  {
    icon: PlayCircle,
    step: "03",
    title: "Calm, consistent narration",
    body: "Characters API delivers warm, non-frenetic voice. Learners adjust speed, pause length, and visual density to fit them.",
  },
];

export default function HowItWorks() {
  return (
    <section className="w-full px-4 md:px-8 py-20 md:py-32 bg-[#f4f4f5]">
      <div className="max-w-6xl mx-auto">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-100px" }}
          transition={{ duration: 0.6 }}
          className="max-w-2xl mb-16 md:mb-20"
        >
          <span className="text-xs uppercase tracking-[0.2em] text-neutral-600">How it works</span>
          <h2 className="mt-4 text-3xl md:text-5xl lg:text-[56px] font-normal text-neutral-950 leading-[1.1] tracking-tight">
            One input. A video tuned to the learner.
          </h2>
        </motion.div>

        <div className="grid md:grid-cols-3 gap-4 md:gap-6">
          {steps.map((s, i) => (
            <motion.div
              key={s.step}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: "-50px" }}
              transition={{ duration: 0.6, delay: i * 0.1 }}
              className="p-6 md:p-8 rounded-3xl bg-neutral-200 border border-neutral-300 min-h-[260px] flex flex-col"
            >
              <div className="flex items-center justify-between mb-6">
                <span className="text-xs font-normal text-neutral-500 tracking-wider">{s.step}</span>
                <s.icon className="w-5 h-5 text-neutral-800" weight="fill" />
              </div>
              <h3 className="text-xl md:text-2xl font-normal text-neutral-950 mb-3 leading-tight">{s.title}</h3>
              <p className="text-sm md:text-base text-neutral-700 leading-relaxed mt-auto">{s.body}</p>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
