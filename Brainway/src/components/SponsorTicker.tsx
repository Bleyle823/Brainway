const sponsors = [
  { name: "Frame Blox", glyph: "bullseye" },
  { name: "Supa Blox", glyph: "ring" },
  { name: "Hype Blox", glyph: "pause" },
  { name: "Ultra Blox", glyph: "dots" },
  { name: "Ship Blox", glyph: "slant" },
  { name: "Northline", glyph: "arc" },
  { name: "Brightcell", glyph: "cell" },
] as const;

function SponsorGlyph({ kind }: { kind: (typeof sponsors)[number]["glyph"] }) {
  const common = "flex h-9 w-9 shrink-0 items-center justify-center rounded-full border-2 border-neutral-950";
  switch (kind) {
    case "bullseye":
      return (
        <span className={common}>
          <span className="relative flex h-4 w-4 items-center justify-center rounded-full border-2 border-neutral-950">
            <span className="h-1.5 w-1.5 rounded-full bg-neutral-950" />
          </span>
        </span>
      );
    case "ring":
      return <span className={`${common} border-2 border-neutral-950 bg-transparent`} />;
    case "pause":
      return (
        <span className={`${common} border-0 bg-transparent`}>
          <span className="flex gap-1">
            <span className="h-6 w-1.5 rounded-sm bg-neutral-950" />
            <span className="h-6 w-1.5 rounded-sm bg-neutral-950" />
          </span>
        </span>
      );
    case "dots":
      return (
        <span className={`${common} border-0 bg-transparent gap-1`}>
          <span className="h-2.5 w-2.5 rounded-full bg-neutral-950" />
          <span className="h-2.5 w-2.5 rounded-full bg-neutral-950" />
        </span>
      );
    case "slant":
      return (
        <span className={`${common} border-0 bg-transparent`}>
          <span className="flex -skew-x-12 gap-1">
            <span className="h-6 w-1.5 rounded-sm bg-neutral-950" />
            <span className="h-6 w-1.5 rounded-sm bg-neutral-950" />
          </span>
        </span>
      );
    case "arc":
      return (
        <span className={common}>
          <span className="h-4 w-4 rounded-full border-2 border-neutral-950 border-b-transparent border-l-transparent rotate-45" />
        </span>
      );
    case "cell":
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
    default:
      return <span className={common} />;
  }
}

function SponsorItem({ name, glyph }: { name: string; glyph: (typeof sponsors)[number]["glyph"] }) {
  return (
    <div className="flex items-center gap-3 px-2">
      <SponsorGlyph kind={glyph} />
      <span className="text-base font-semibold tracking-tight text-neutral-950 whitespace-nowrap">{name}</span>
    </div>
  );
}

export default function SponsorTicker() {
  const doubled = [...sponsors, ...sponsors];

  return (
    <section className="w-full border-y border-neutral-200 bg-white py-6 md:py-8">
      <div className="mx-auto max-w-6xl px-4 md:px-8">
        <p className="mb-5 max-w-xl text-sm text-neutral-600 md:mb-0 md:hidden">
          Brainway collaborates with research-led organisations to ship sensory-aware learning video at scale.
        </p>
      </div>
      <div className="relative overflow-hidden">
        <div className="pointer-events-none absolute inset-y-0 left-0 z-10 w-16 bg-gradient-to-r from-white to-transparent md:w-24" />
        <div className="pointer-events-none absolute inset-y-0 right-0 z-10 w-16 bg-gradient-to-l from-white to-transparent md:w-24" />
        <div className="bw-marquee-track items-center gap-12 md:gap-20 pl-6 md:pl-10">
          {doubled.map((s, i) => (
            <SponsorItem key={`${s.name}-${i}`} name={s.name} glyph={s.glyph} />
          ))}
        </div>
      </div>
    </section>
  );
}
