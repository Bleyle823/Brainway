import { Link } from "@tanstack/react-router";
import { BRAND_KIT_FIGMA_URL } from "@/lib/brand-kit";

const cols = [
  { title: "Product", links: ["Overview", "How it works", "Pricing", "Changelog"] },
  { title: "For", links: ["Schools", "Therapists", "E-learning", "Parents"] },
  { title: "Company", links: ["About", "Research", "Careers", "Contact"] },
  { title: "Resources", links: ["Docs", "Sensory load score", "Accessibility", "Press kit"] },
];

export default function Footer() {
  return (
    <footer className="w-full px-2 md:px-3 pb-2 md:pb-3 bg-white">
      <div className="w-full rounded-3xl md:rounded-4xl bg-neutral-950 text-neutral-100 px-6 md:px-12 py-14 md:py-20 border border-neutral-700">
        <div className="grid lg:grid-cols-[1.5fr_3fr] gap-12 lg:gap-16">
          <div>
            <Link to="/" className="inline-flex items-center gap-3">
              <img
                src="/brainwave-logo.png"
                alt=""
                width={40}
                height={40}
                className="h-10 w-10 shrink-0 object-contain"
              />
              <span className="text-2xl font-normal tracking-tight">Brainway</span>
            </Link>
            <p className="mt-4 text-sm text-neutral-400 leading-relaxed max-w-xs">
              Sensory-aware video for the 1 in 7 learners traditional media leaves behind.
            </p>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
            {cols.map((c) => (
              <div key={c.title}>
                <h4 className="text-xs uppercase tracking-[0.2em] text-neutral-500 mb-4">{c.title}</h4>
                <ul className="flex flex-col gap-2.5">
                  {c.links.map((l) => (
                    <li key={l}>
                      <a href="#" className="text-sm text-neutral-300 hover:text-white transition-colors">
                        {l}
                      </a>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </div>
        <div className="mt-14 pt-6 border-t border-neutral-700 flex flex-col md:flex-row items-start md:items-center justify-between gap-3 text-xs text-neutral-500">
          <span>© {new Date().getFullYear()} Brainway. Built for every kind of mind.</span>
          <div className="flex flex-wrap gap-5">
            <Link to="/community" className="hover:text-neutral-300 transition-colors">
              Community safe library
            </Link>
            <a
              href={BRAND_KIT_FIGMA_URL}
              target="_blank"
              rel="noopener noreferrer"
              className="hover:text-neutral-300 transition-colors"
            >
              Brand kit (Figma)
            </a>
            <a href="#" className="hover:text-neutral-300 transition-colors">Privacy</a>
            <a href="#" className="hover:text-neutral-300 transition-colors">Terms</a>
            <a href="#" className="hover:text-neutral-300 transition-colors">Accessibility statement</a>
          </div>
        </div>
      </div>
    </footer>
  );
}
