import * as React from "react";

export default function FeatureCard({ children }: { children: React.ReactNode }) {
  return <div className="rounded-2xl p-4 bg-white/90 shadow-md">{children}</div>;
}

