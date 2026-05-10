import { createFileRoute } from "@tanstack/react-router";
import Hero from "@/components/Hero";
import SponsorTicker from "@/components/SponsorTicker";
import FeatureHighlights from "@/components/FeatureHighlights";
import UseModesSection from "@/components/UseModesSection";
import Problem from "@/components/Problem";
import HowItWorks from "@/components/HowItWorks";
import Audience from "@/components/Audience";
import CTA from "@/components/CTA";
import Footer from "@/components/Footer";

export const Route = createFileRoute("/")({
  component: Index,
  head: () => ({
    meta: [
      { title: "Brainwave — Sensory-aware video for neurodivergent learners" },
      {
        name: "description",
        content:
          "Brainwave turns PDFs, URLs, and voice memos into calm, sensory-safe Gen-4.5 video designed for ADHD and autistic learners.",
      },
    ],
  }),
});

function Index() {
  return (
    <main>
      <Hero />
      <SponsorTicker />
      <FeatureHighlights />
      <UseModesSection />
      <Problem />
      <HowItWorks />
      <Audience />
      <CTA />
      <Footer />
    </main>
  );
}
