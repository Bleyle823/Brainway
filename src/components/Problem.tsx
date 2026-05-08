import { motion } from "motion/react";
import { Zap, Volume2, Eye } from "lucide-react";

const points = [
  {
    icon: Zap,
    title: "Fast cuts overload working memory",
    body: "Standard edits change shot every 1.5s. ADHD brains spend energy re-orienting instead of learning.",
  },
  {
    icon: Eye,
    title: "Dense text crowds the frame",
    body: "Lower-thirds, captions, B-roll motion — all at once. Autistic learners report visual fatigue within minutes.",
  },
  {
    icon: Volume2,
    title: "Unpredictable audio breaks focus",
    body: "Music swells, sudden SFX, frantic VO pacing. Sensory spikes derail comprehension and trigger shutdown.",
  },
];

export default function Problem() {
  return (
    <section className="w-full px-4 md:px-8 py-20 md:py-32 bg-[#f0f0f0]">
      <div className="max-w-6xl mx-auto">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-100px" }}
          transition={{ duration: 0.6 }}
          className="max-w-2xl mb-16 md:mb-20"
        >
          <span className="text-xs uppercase tracking-[0.2em] text-[rgba(30,50,90,0.5)]">The problem</span>
          <h2 className="mt-4 text-3xl md:text-5xl lg:text-[56px] font-normal text-[#3b3a52] leading-[1.1] tracking-tight">
            Traditional video is hostile to a seventh of your audience.
          </h2>
        </motion.div>

        <div className="grid md:grid-cols-3 gap-4 md:gap-6">
          {points.map((p, i) => (
            <motion.div
              key={p.title}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: "-50px" }}
              transition={{ duration: 0.6, delay: i * 0.1 }}
              className="p-6 md:p-8 rounded-[1.5rem] bg-white/60 backdrop-blur-sm border border-white/40"
            >
              <div className="w-11 h-11 rounded-full bg-[rgba(30,50,90,0.05)] border border-[rgba(30,50,90,0.1)] flex items-center justify-center mb-5">
                <p.icon className="w-5 h-5 text-[rgba(30,50,90,0.8)]" />
              </div>
              <h3 className="text-lg md:text-xl font-normal text-[#3b3a52] mb-2">{p.title}</h3>
              <p className="text-sm md:text-base text-[rgba(30,50,90,0.65)] leading-relaxed">{p.body}</p>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
