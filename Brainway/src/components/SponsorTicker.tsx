import { LANDING_COLLABORATIONS } from "@/lib/landing-collaborations";

function TickerGlyph() {
  const common =
    "flex h-9 w-9 shrink-0 items-center justify-center rounded-full border-2 border-neutral-950";
  return (
    <span className={common}>
      <span className="grid grid-cols-2 gap-0.5">
        <span className="h-1.5 w-1.5 rounded-sm bg-neutral-950" />
        <span className="h-1.5 w-1.5 rounded-sm bg-neutral-950" />
        <span className="h-1.5 w-1.5 rounded-sm bg-neutral-950" />
        <span className="h-1.5 w-1.5 rounded-sm bg-neutral-950" />
      </span>
    </span>
  );
}

function TickerItem({ name }: { name: string }) {
  return (
    <div className="flex items-center gap-3 px-2">
      <TickerGlyph />
      <span className="text-base font-semibold tracking-tight text-neutral-950 whitespace-nowrap">{name}</span>
    </div>
  );
}

export default function SponsorTicker() {
  const labels = LANDING_COLLABORATIONS.map((c) => c.name);
  const doubled = [...labels, ...labels];

  return (
    <section className="w-full border-y border-neutral-200 bg-white py-6 md:py-8">
      <div className="mx-auto max-w-6xl px-4 md:px-8">
        <p className="mb-5 max-w-xl text-sm text-neutral-600 md:mb-0 md:hidden">
          Brainway collaborates with research led organisations and product partners to ship sensory aware learning
          video at scale.
        </p>
      </div>
      <div className="relative overflow-hidden">
        <div className="pointer-events-none absolute inset-y-0 left-0 z-10 w-16 bg-gradient-to-r from-white to-transparent md:w-24" />
        <div className="pointer-events-none absolute inset-y-0 right-0 z-10 w-16 bg-gradient-to-l from-white to-transparent md:w-24" />
        <div className="bw-marquee-track items-center gap-12 md:gap-20 pl-6 md:pl-10">
          {doubled.map((name, i) => (
            <TickerItem key={`${name}-${i}`} name={name} />
          ))}
        </div>
      </div>
    </section>
  );
}
