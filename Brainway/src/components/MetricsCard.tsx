import * as React from "react";

export default function MetricsCard({ children }: { children: React.ReactNode }) {
  return <div className="rounded-2xl p-4 bg-white shadow-sm">{children}</div>;
}

