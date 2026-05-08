import { createFileRoute, Link } from "@tanstack/react-router";
import { VideoCamera } from "@phosphor-icons/react";
import Hero from "@/components/Hero";
import Problem from "@/components/Problem";
import HowItWorks from "@/components/HowItWorks";
import Audience from "@/components/Audience";
import CTA from "@/components/CTA";
import Footer from "@/components/Footer";

export const Route = createFileRoute("/")({
  component: Index,
  head: () => ({
    meta: [
      { title: "CogniBridge — Sensory-aware video for neurodivergent learners" },
      {
        name: "description",
        content:
          "CogniBridge turns PDFs, URLs, and voice memos into calm, sensory-safe Gen-4.5 video designed for ADHD and autistic learners.",
      },
    ],
  }),
});

function Index() {
  return (
    <main>
      <Hero />
      <div className="w-full bg-neutral-200 px-4 py-6 flex justify-center">
        <Link
          to="/live"
          className="inline-flex items-center gap-2 text-sm text-neutral-950 bg-white/80 border border-neutral-400/70 rounded-full px-5 py-2.5 hover:bg-white transition-colors shadow-sm"
        >
          <VideoCamera className="w-4 h-4" weight="fill" />
          Start a live learner-safe Character session
        </Link>
      </div>
      <Problem />
      <HowItWorks />
      <Audience />
      <CTA />
      <Footer />
    </main>
  );
}
