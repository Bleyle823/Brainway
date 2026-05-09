/**
 * Runway Developer API host.
 * Docs: hostname is api.dev.runwayml.com (the "dev" subdomain is not a staging environment).
 *
 * Override with RUNWAYML_API_BASE_URL when needed (must include `/v1`, e.g. https://api.dev.runwayml.com/v1).
 * RUNWAYML_BASE_URL is accepted as an alias for SDK parity.
 * If you set only the origin (e.g. https://api.dev.runwayml.com), `/v1` is appended automatically.
 *
 * Two helpers are exposed:
 *   - getRunwayApiBase()   → URL ending in `/v1`, used for our own `fetch` REST calls.
 *   - getRunwayApiOrigin() → URL with NO path, used when constructing `@runwayml/sdk`
 *     clients (the SDK appends its own `/v1/<endpoint>` paths and would otherwise
 *     produce `/v1/v1/...` 404s).
 */

export const RUNWAY_API_VERSION = "2024-11-06";

const DEFAULT_RUNWAY_API_BASE = "https://api.dev.runwayml.com/v1";

export function getRunwayApiBase(): string {
  const raw =
    process.env.RUNWAYML_API_BASE_URL?.trim() ||
    process.env.RUNWAYML_BASE_URL?.trim() ||
    DEFAULT_RUNWAY_API_BASE;

  try {
    const u = new URL(raw.startsWith("http") ? raw : `https://${raw}`);
    if (u.pathname === "/" || u.pathname === "") {
      u.pathname = "/v1";
    }
    return `${u.origin}${u.pathname}`.replace(/\/$/, "");
  } catch {
    return DEFAULT_RUNWAY_API_BASE;
  }
}

/**
 * Returns just the API origin (no `/v1`, no trailing slash).
 *
 * Pass this as `baseURL` when constructing a `RunwayML` SDK client — the SDK already
 * prepends `/v1/...` to every endpoint. Using `getRunwayApiBase()` here would build
 * URLs like `https://api.dev.runwayml.com/v1/v1/image_to_video` and 404.
 */
export function getRunwayApiOrigin(): string {
  try {
    return new URL(getRunwayApiBase()).origin;
  } catch {
    return "https://api.dev.runwayml.com";
  }
}

/** Trims whitespace — common copy/paste issue. Keys are org-scoped in the Developer Portal. */
export function getRunwayApiSecret(): string {
  const key = process.env.RUNWAYML_API_SECRET?.trim();
  if (!key) {
    throw new Error(
      "RUNWAYML_API_SECRET is not configured. Set it in .env / .env.local and restart the dev server.",
    );
  }
  return key;
}
