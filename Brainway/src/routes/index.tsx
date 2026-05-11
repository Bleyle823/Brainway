import { createFileRoute } from "@tanstack/react-router";
import Hero from "@/components/Hero";
import SponsorTicker from "@/components/SponsorTicker";
import FeatureHighlights from "@/components/FeatureHighlights";
import LiveMeetingSection from "@/components/LiveMeetingSection";
import RoadmapSection from "@/components/RoadmapSection";
import EcosystemSection from "@/components/EcosystemSection";
import CollaborationsSection from "@/components/CollaborationsSection";
import UseModesSection from "@/components/UseModesSection";
import Problem from "@/components/Problem";
import HowItWorks from "@/components/HowItWorks";
import Audience from "@/components/Audience";
import CTA from "@/components/CTA";
import BrandKitCallout from "@/components/BrandKitCallout";
import Footer from "@/components/Footer";

export const Route = createFileRoute("/")({
  component: Index,
  head: () => ({
    meta: [
      { title: "Brainway — Sensory-aware video for neurodivergent learners" },
      {
        name: "description",
        content:
          "Brainway turns learning materials into calm, sensory aware video and live Runway Characters sessions. Roadmap includes sign language aware avatars for deaf and hard of hearing learners, plus Hermes and ElizaOS developer plugins.",
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
      <LiveMeetingSection />
      <CollaborationsSection />
      <UseModesSection />
      <Problem />
      <HowItWorks />
      <Audience />
      <CTA />
      <BrandKitCallout />
      <RoadmapSection />
      <EcosystemSection />
      <Footer />
    </main>
  );
}
