/**
 * Partners and cosign slots for the landing page (ticker, feature strip, collaborations grid).
 */

export type LandingCollaboration = {
  name: string;
  role: string;
  href?: string;
};

export type ClinicalCosign = {
  /** Stable key for lists */
  id: string;
  /** Primary line on the card (often with post-nominals) */
  name: string;
  /** Role / affiliation subtitle */
  headline: string;
  degrees: string[];
  experience: string[];
  /** Optional programs or initiatives */
  initiatives?: string[];
  /** Platform co-sign narrative (when applicable) */
  cosignStatement?: string;
  /** E.164 or digits for tel: href */
  phone?: string;
  /** Shorter label for sponsor marquee */
  tickerName: string;
};

export const CLINICAL_COSIGNS: ClinicalCosign[] = [
  {
    id: "preskilla",
    name: "Dr. Preskilla Akoth Ochieng-Munda, Ph.D.",
    headline: "Clinical Psychologist and Founder, Build Mind Muscle — Nairobi, Kenya",
    degrees: [
      "Ph.D. Clinical Psychology, Daystar University (2017–2020)",
      "M.A. Counselling Psychology, Daystar University (2010–2012)",
      "M.B.A. Marketing, USIU (1998–2000)",
      "B.Sc. Biochemistry and Zoology, University of Nairobi (1990–1995)",
    ],
    experience: [
      "Lecturer at Africa International University (Clinical Psychology, since 2014), Pan Africa Christian University, and Multimedia University",
      "Psychotherapist at Oasis Africa; corporate training for USAID, HFC, Momentum Credit, KCF DORCAS Society, and others",
    ],
    initiatives: [
      "Creator of the Build Mind Muscle resilience program",
      "Creator of the Psychologically Heal to Level Up initiative",
    ],
    phone: "+254705297628",
    tickerName: "Dr. Preskilla Akoth Ochieng-Munda",
  },
  {
    id: "sylvia",
    name: "Sylvia Akinyi Osewe",
    headline: "Program Coordinator and Counselling Psychologist",
    degrees: [
      "Master's Degree in Counselling Psychology, Kenyatta University",
      "Bachelor's in Early Childhood Education",
      "Diploma in Education",
    ],
    experience: [
      "20+ years working with children, adolescents, young adults, and women across Kenyan schools",
      "Implemented peer education and counselling programs through FAWE Kenya Chapter",
      "Specialist in resilience training, emotional intelligence, cognitive restructuring, and Post-Traumatic Growth",
    ],
    cosignStatement:
      "Sylvia has reviewed the platform's educational workflows and co-signed its use in school-based and community mental health settings. Her experience in curriculum implementation and school guidance counselling directly informs how the platform's accessibility presets work in real classroom contexts.",
    tickerName: "Sylvia Akinyi Osewe",
  },
];

export const LANDING_COLLABORATIONS: LandingCollaboration[] = [
  {
    name: "Runway",
    role: "Video and Characters APIs",
    href: "https://runwayml.com/",
  },
  {
    name: "Recall.ai",
    role: "Live meeting bots",
    href: "https://www.recall.ai/",
  },
  {
    name: "Africa Nazarene University",
    role:
      "Department of Education — Head of Department. Brainway has reached out to explore a pilot partnership.",
    href: "https://www.anu.ac.ke/",
  },
];

/** Names shown in the hero sponsor marquee (partners + clinical co-signers). */
export function getLandingTickerNames(): string[] {
  return [
    ...LANDING_COLLABORATIONS.map((c) => c.name),
    ...CLINICAL_COSIGNS.map((c) => c.tickerName),
  ];
}

/** Partner strip links + clinical names (no URL). */
export function getCollaborationStripItems(): { name: string; href?: string }[] {
  return [
    ...LANDING_COLLABORATIONS.map((c) => ({ name: c.name, href: c.href })),
    ...CLINICAL_COSIGNS.map((c) => ({ name: c.tickerName })),
  ];
}
