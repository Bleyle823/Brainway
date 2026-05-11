/** Public Figma file: brand guidelines / brand kit (logos, colours, type). */
export const BRAND_KIT_FIGMA_URL =
  "https://www.figma.com/design/mq4yo04YkrbeiBUv8tsto6/Brand-Guidelines---50--Slides--Community---Copy---Copy-?node-id=0-1&t=6Xe0JQF33f8mEgyZ-1";

/** Google Form: Brainway User Feedback (roles, Runway familiarity, privacy notice). */
export const USER_FEEDBACK_FORM_URL =
  "https://docs.google.com/forms/d/e/1FAIpQLSfFEW0wBClgZcT_FMfAsZggz4TxhLIdcpu_ScHfqebxQE5krA/viewform?usp=header";

/** Monorepo source (marketing hero, footer-style links). */
export const PROJECT_GITHUB_URL = "https://github.com/Bleyle823/Brainway";

/**
 * Where visitors open Runway to use the product (Hermes plugin + Runway tools run in that ecosystem).
 * Set `VITE_RUNWAY_HERMES_BOT_URL` in `.env` when you have a direct public bot / share URL.
 */
const hermesBotFromEnv = import.meta.env.VITE_RUNWAY_HERMES_BOT_URL;
export const RUNWAY_HERMES_BOT_URL =
  typeof hermesBotFromEnv === "string" && hermesBotFromEnv.trim() ? hermesBotFromEnv.trim() : "https://app.runwayml.com/";
