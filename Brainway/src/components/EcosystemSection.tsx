import { motion } from "motion/react";
import { Code, Plugs } from "@phosphor-icons/react";

const REPO_BASE = "https://github.com/Bleyle823/Brainway";

const BLOCKS: {
  title: string;
  body: string;
  links?: { label: string; href: string }[];
}[] = [
  {
    title: "Runway",
    body: "Generative video, image tasks, and realtime Characters sessions power the app. Brainway keeps org secrets on the server and routes learner safe prompts through the same APIs.",
    links: [{ label: "Runway developer docs", href: "https://docs.dev.runwayml.com/" }],
  },
  {
    title: "Recall.ai and recall bridge",
    body: "Optional path for sending a Character into Zoom, Google Meet, or Microsoft Teams. Deploy the Node recall bridge, set a public HTTPS URL, and wire RECALL_BRIDGE_URL in Brainway for the guided /meet flow.",
    links: [
      { label: "Recall.ai", href: "https://www.recall.ai/" },
      { label: "recall bridge README", href: `${REPO_BASE}/blob/main/recall-bridge/README.md` },
    ],
  },
  {
    title: "Hermes plugin",
    body: "Python plugin for the Hermes agent host: Runway tools for models, video, images, Characters, and transforms. Copy into your Hermes plugins path, set the API secret, enable the plugin, restart Hermes.",
    links: [{ label: "plugins/runway", href: `${REPO_BASE}/tree/main/plugins/runway` }],
  },
  {
    title: "ElizaOS plugin",
    body: "TypeScript package for ElizaOS: actions and providers for Runway media workflows, including Character sessions that return LiveKit style fields for avatars-react in a browser UI. Major stacks in this ecosystem already integrate established protocols; ElevenLabs is a widely used example. A Runway plugin reaches the same agent installations when teams need video and Characters, which makes it a serious distribution surface, not a side experiment.",
    links: [
      { label: "plugins/plugin-runway", href: `${REPO_BASE}/tree/main/plugins/plugin-runway` },
      { label: "Plugins overview (docs)", href: `${REPO_BASE}/blob/main/docs/plugins-overview.mdx` },
    ],
  },
];

export default function EcosystemSection() {
  return (
    <section
      id="ecosystem"
      className="w-full bg-[#fafafa] px-4 py-16 md:px-8 md:py-24"
      aria-labelledby="ecosystem-heading"
    >
      <div className="mx-auto max-w-6xl">
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-80px" }}
          transition={{ duration: 0.5 }}
          className="max-w-2xl"
        >
          <p className="text-xs font-semibold uppercase tracking-[0.25em] text-neutral-500 flex items-center gap-2">
            <Plugs className="h-4 w-4" weight="duotone" />
            Developer tools
          </p>
          <h2 id="ecosystem-heading" className="mt-3 text-3xl font-semibold tracking-tight text-neutral-950 md:text-4xl">
            Ecosystem
          </h2>
          <p className="mt-4 text-base text-neutral-600 leading-relaxed">
            Brainway is the product app. The same Runway capabilities are also packaged for agent runtimes so builders can automate media outside the browser.
          </p>
        </motion.div>

        <div className="mt-12 grid gap-5 md:grid-cols-2">
          {BLOCKS.map((block, idx) => (
            <motion.article
              key={block.title}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: "-40px" }}
              transition={{ duration: 0.5, delay: idx * 0.04 }}
              className="rounded-[1.5rem] border border-neutral-200 bg-white p-6 md:p-8 shadow-sm"
            >
              <Code className="h-6 w-6 text-neutral-400" weight="duotone" aria-hidden />
              <h3 className="mt-4 text-xl font-semibold text-neutral-950">{block.title}</h3>
              <p className="mt-3 text-sm text-neutral-600 leading-relaxed md:text-base">{block.body}</p>
              {block.links && block.links.length > 0 && (
                <ul className="mt-4 flex flex-col gap-2">
                  {block.links.map((link) => (
                    <li key={link.href}>
                      <a
                        href={link.href}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-sm font-medium text-neutral-900 underline decoration-neutral-300 underline-offset-4 hover:decoration-neutral-900"
                      >
                        {link.label}
                      </a>
                    </li>
                  ))}
                </ul>
              )}
            </motion.article>
          ))}
        </div>
      </div>
    </section>
  );
}
