import { motion } from "motion/react";
import { Handshake } from "@phosphor-icons/react";
import { LANDING_COLLABORATIONS } from "@/lib/landing-collaborations";

export default function CollaborationsSection() {
  return (
    <section
      id="collaborations"
      className="w-full bg-white px-4 py-16 md:px-8 md:py-20 border-b border-neutral-200"
      aria-labelledby="collaborations-heading"
    >
      <div className="mx-auto max-w-6xl">
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-80px" }}
          transition={{ duration: 0.5 }}
          className="max-w-2xl"
        >
          <p className="text-xs font-semibold uppercase tracking-[0.25em] text-neutral-500 flex items-center gap-2">
            <Handshake className="h-4 w-4" weight="duotone" />
            Collaborations and cosigns
          </p>
          <h2 id="collaborations-heading" className="mt-3 text-3xl font-semibold tracking-tight text-neutral-950 md:text-4xl">
            Built with partners
          </h2>
          <p className="mt-4 text-base text-neutral-600 leading-relaxed">
            We work with research led groups and product teams to keep sensory aware learning video grounded in real
            classrooms. Naming below mixes live integrations with open slots you can fill as programs commit.
          </p>
        </motion.div>

        <ul className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {LANDING_COLLABORATIONS.map((item, idx) => (
            <motion.li
              key={item.name}
              initial={{ opacity: 0, y: 16 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: "-40px" }}
              transition={{ duration: 0.45, delay: idx * 0.05 }}
              className="rounded-2xl border border-neutral-200 bg-neutral-50/90 p-5"
            >
              {item.href ? (
                <a
                  href={item.href}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-base font-semibold text-neutral-950 underline-offset-4 hover:underline"
                >
                  {item.name}
                </a>
              ) : (
                <span className="text-base font-semibold text-neutral-950">{item.name}</span>
              )}
              <p className="mt-2 text-sm text-neutral-600 leading-relaxed">{item.role}</p>
            </motion.li>
          ))}
        </ul>
      </div>
    </section>
  );
}
