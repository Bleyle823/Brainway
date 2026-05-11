import { motion } from "motion/react";
import { Handshake, SealCheck } from "@phosphor-icons/react";
import { CLINICAL_COSIGNS, LANDING_COLLABORATIONS } from "@/lib/landing-collaborations";

function formatPhoneDisplay(phone: string): string {
  const digits = phone.replace(/\D/g, "");
  if (digits.startsWith("254") && digits.length >= 12) {
    return `+${digits.slice(0, 3)} ${digits.slice(3, 6)} ${digits.slice(6, 9)} ${digits.slice(9)}`;
  }
  return phone;
}

export default function CollaborationsSection() {
  return (
    <section
      id="collaborations"
      className="w-full bg-white px-4 py-16 md:px-8 md:py-20 border-b border-neutral-200"
      aria-labelledby="collaborations-heading"
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
            <Handshake className="h-4 w-4" weight="duotone" />
            Collaborations and cosigns
          </p>
          <h2 id="collaborations-heading" className="mt-3 text-3xl font-semibold tracking-tight text-neutral-950 md:text-4xl">
            Built with partners
          </h2>
          <p className="mt-4 text-base text-neutral-600 leading-relaxed">
            We work with research-led groups, licensed clinicians, and product teams so sensory-aware learning video
            stays grounded in real classrooms and ethical review. Clinical co-signers below have reviewed Brainway’s
            workflows for school and community use; integrations and outreach partners are named alongside.
          </p>
        </motion.div>

        <div className="mt-12">
          <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.25em] text-neutral-500">
            <SealCheck className="h-4 w-4" weight="duotone" aria-hidden />
            <span id="clinical-cosign-heading">Clinical co-sign</span>
          </div>
          <div className="mt-6 grid gap-6 lg:grid-cols-2" role="list" aria-labelledby="clinical-cosign-heading">
            {CLINICAL_COSIGNS.map((person, idx) => (
              <motion.article
                key={person.id}
                role="listitem"
                initial={{ opacity: 0, y: 16 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: "-40px" }}
                transition={{ duration: 0.45, delay: idx * 0.06 }}
                className="rounded-2xl border border-neutral-200 bg-neutral-50/90 p-6 md:p-8"
              >
                <h3 className="text-lg font-semibold tracking-tight text-neutral-950 md:text-xl">{person.name}</h3>
                <p className="mt-2 text-sm font-medium text-neutral-700 leading-relaxed">{person.headline}</p>

                <div className="mt-5">
                  <p className="text-xs font-semibold uppercase tracking-wider text-neutral-500">Education</p>
                  <ul className="mt-2 list-disc space-y-1.5 pl-5 text-sm text-neutral-700 leading-relaxed">
                    {person.degrees.map((line) => (
                      <li key={line}>{line}</li>
                    ))}
                  </ul>
                </div>

                <div className="mt-5">
                  <p className="text-xs font-semibold uppercase tracking-wider text-neutral-500">Experience</p>
                  <ul className="mt-2 list-disc space-y-1.5 pl-5 text-sm text-neutral-700 leading-relaxed">
                    {person.experience.map((line) => (
                      <li key={line}>{line}</li>
                    ))}
                  </ul>
                </div>

                {person.initiatives && person.initiatives.length > 0 && (
                  <div className="mt-5">
                    <p className="text-xs font-semibold uppercase tracking-wider text-neutral-500">Programs</p>
                    <ul className="mt-2 list-disc space-y-1.5 pl-5 text-sm text-neutral-700 leading-relaxed">
                      {person.initiatives.map((line) => (
                        <li key={line}>{line}</li>
                      ))}
                    </ul>
                  </div>
                )}

                {person.cosignStatement && (
                  <p className="mt-5 text-sm text-neutral-700 leading-relaxed border-t border-neutral-200/90 pt-5">
                    {person.cosignStatement}
                  </p>
                )}

                {person.phone && (
                  <p className="mt-5 text-sm text-neutral-800">
                    <span className="font-medium text-neutral-950">Contact: </span>
                    <a
                      href={`tel:${person.phone.replace(/\s/g, "")}`}
                      className="underline decoration-neutral-400 underline-offset-4 hover:decoration-neutral-950"
                    >
                      {formatPhoneDisplay(person.phone)}
                    </a>
                  </p>
                )}
              </motion.article>
            ))}
          </div>
        </div>

        <h3 className="mt-14 text-xs font-semibold uppercase tracking-[0.25em] text-neutral-500">
          Integrations and outreach
        </h3>
        <ul className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {LANDING_COLLABORATIONS.map((item, idx) => (
            <motion.li
              key={item.name}
              initial={{ opacity: 0, y: 16 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: "-40px" }}
              transition={{ duration: 0.45, delay: idx * 0.05 }}
              className="rounded-2xl border border-neutral-200 bg-neutral-50/90 p-5"
            >
              {item.href ? (
                <a
                  href={item.href}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-base font-semibold text-neutral-950 underline-offset-4 hover:underline"
                >
                  {item.name}
                </a>
              ) : (
                <span className="text-base font-semibold text-neutral-950">{item.name}</span>
              )}
              <p className="mt-2 text-sm text-neutral-600 leading-relaxed">{item.role}</p>
            </motion.li>
          ))}
        </ul>
      </div>
    </section>
  );
}
