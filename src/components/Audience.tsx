import { motion } from "motion/react";
import { GraduationCap, Heart, Building2, Users } from "lucide-react";

const groups = [
  { icon: GraduationCap, title: "Schools & Districts", body: "Make existing curricula accessible without rewriting a single lesson." },
  { icon: Heart, title: "Therapy Platforms", body: "Deliver social stories and skill-building content at sensory-safe pacing." },
  { icon: Building2, title: "E-learning Companies", body: "Reach the 15% of users who churn from standard explainer video formats." },
  { icon: Users, title: "Parents & Tutors", body: "Turn a homework PDF into a calm 4-minute video your kid can actually finish." },
];

export default function Audience() {
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
          <span className="text-xs uppercase tracking-[0.2em] text-[rgba(30,50,90,0.5)]">Who it's for</span>
          <h2 className="mt-4 text-3xl md:text-5xl lg:text-[56px] font-normal text-[#3b3a52] leading-[1.1] tracking-tight">
            A massive, underserved market.
          </h2>
        </motion.div>

        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4 md:gap-5">
          {groups.map((g, i) => (
            <motion.div
              key={g.title}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: "-50px" }}
              transition={{ duration: 0.5, delay: i * 0.08 }}
              className="p-6 rounded-[1.25rem] bg-white/50 backdrop-blur-sm border border-white/40 hover:bg-white/70 transition-colors"
            >
              <g.icon className="w-6 h-6 text-[rgba(30,50,90,0.75)] mb-4" />
              <h3 className="text-base md:text-lg font-normal text-[#3b3a52] mb-2">{g.title}</h3>
              <p className="text-sm text-[rgba(30,50,90,0.6)] leading-relaxed">{g.body}</p>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
