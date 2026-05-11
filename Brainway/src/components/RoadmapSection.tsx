import { motion } from "motion/react";
import { Link } from "@tanstack/react-router";
import { ArrowRight, Path } from "@phosphor-icons/react";

const STEPS: { title: string; body: string }[] = [
  {
    title: "Sign language aware Characters",
    body: "We are designing Runway Characters workflows aimed at deaf and hard of hearing learners: an expressive avatar layer beside instruction, not a substitute for human interpreters or national sign language standards. This is a new direction for the Characters API in inclusive classrooms.",
  },
  {
    title: "Proof with real classrooms",
    body: "Structured pilots with schools and clinics, consenting feedback on profiles, and simple outcome logging so teams know what works for ADHD, autistic, dyslexic, and sensory sensitive groups.",
  },
  {
    title: "Community library you can trust",
    body: "Move the public neurosafe library from demo memory to durable storage, moderation, and clearer contributor rules.",
  },
  {
    title: "Organisations and safe tenancy",
    body: "Accounts for schools and teams, roles, and audit friendly access patterns for institutional rollout.",
  },
  {
    title: "Fit your LMS",
    body: "Exports, captions, and transcript hooks toward common learning tools so calm media does not stay siloed in one app.",
  },
  {
    title: "More languages and low bandwidth paths",
    body: "Expand locales where Runway and the product allow, and add quality steps for slower networks.",
  },
  {
    title: "Agent plugins that ship with Hermes and ElizaOS",
    body: "Deepen the Runway plugins so developers can drive video, Characters, and audio from the same agent stacks they already use.",
  },
];

export default function RoadmapSection() {
  return (
    <section
      id="roadmap"
      className="w-full bg-white px-4 py-16 md:px-8 md:py-24 border-y border-neutral-200"
      aria-labelledby="roadmap-heading"
    >
      <div className="mx-auto max-w-6xl">
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-80px" }}
          transition={{ duration: 0.5 }}
          className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between"
        >
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.25em] text-neutral-500 flex items-center gap-2">
              <Path className="h-4 w-4" weight="duotone" />
              Roadmap
            </p>
            <h2 id="roadmap-heading" className="mt-3 text-3xl font-semibold tracking-tight text-neutral-950 md:text-4xl max-w-2xl">
              What we are building next
            </h2>
            <p className="mt-4 max-w-xl text-base text-neutral-600 leading-relaxed">
              These are directions that fit the codebase today, not firm delivery dates. The first item is the headline:
              inclusive representation with Characters, developed with care for deaf and hard of hearing communities.
            </p>
          </div>
          <div className="flex flex-wrap gap-3">
            <Link
              to="/live"
              className="inline-flex items-center gap-2 rounded-full border border-neutral-300 bg-neutral-50 px-4 py-2 text-sm font-medium text-neutral-900 hover:bg-neutral-100"
            >
              Live Characters
              <ArrowRight className="h-4 w-4" weight="bold" />
            </Link>
            <Link
              to="/meet"
              className="inline-flex items-center gap-2 rounded-full border border-neutral-300 bg-neutral-50 px-4 py-2 text-sm font-medium text-neutral-900 hover:bg-neutral-100"
            >
              Meetings
              <ArrowRight className="h-4 w-4" weight="bold" />
            </Link>
            <Link
              to="/create"
              className="inline-flex items-center gap-2 rounded-full bg-neutral-950 px-4 py-2 text-sm font-medium text-white hover:bg-neutral-800"
            >
              Create video
              <ArrowRight className="h-4 w-4" weight="bold" />
            </Link>
          </div>
        </motion.div>

        <motion.ol
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-60px" }}
          transition={{ duration: 0.55, delay: 0.05 }}
          className="mt-12 space-y-6"
        >
          {STEPS.map((step, i) => (
            <li
              key={step.title}
              className="flex gap-4 rounded-[1.5rem] border border-neutral-200 bg-neutral-50/80 p-5 md:p-6 md:gap-6"
            >
              <span
                className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-neutral-900 text-sm font-semibold text-white"
                aria-hidden
              >
                {i + 1}
              </span>
              <div>
                <h3 className="text-lg font-semibold text-neutral-950">{step.title}</h3>
                <p className="mt-2 text-sm text-neutral-600 leading-relaxed md:text-base">{step.body}</p>
              </div>
            </li>
          ))}
        </motion.ol>
      </div>
    </section>
  );
}
