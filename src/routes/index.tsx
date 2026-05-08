import { createFileRoute } from "@tanstack/react-router";
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
      <Problem />
      <HowItWorks />
      <Audience />
      <CTA />
      <Footer />
    </main>
  );
}
