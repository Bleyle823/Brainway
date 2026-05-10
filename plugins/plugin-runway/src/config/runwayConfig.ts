/**
 * Runway Developer API URL helpers.
 * SDK clients must use origin-only baseURL; raw REST uses `/v1` base.
 */

export const RUNWAY_API_VERSION = '2024-11-06';

const DEFAULT_RUNWAY_API_BASE = 'https://api.dev.runwayml.com/v1';

export function getRunwayApiBase(): string {
  const raw =
    process.env.RUNWAYML_API_BASE_URL?.trim() ||
    process.env.RUNWAYML_BASE_URL?.trim() ||
    DEFAULT_RUNWAY_API_BASE;

  try {
    const u = new URL(raw.startsWith('http') ? raw : `https://${raw}`);
    if (u.pathname === '/' || u.pathname === '') {
      u.pathname = '/v1';
    }
    return `${u.origin}${u.pathname}`.replace(/\/$/, '');
  } catch {
    return DEFAULT_RUNWAY_API_BASE;
  }
}

/** Origin only — use for `@runwayml/sdk` `baseURL` (SDK adds `/v1/...`). */
export function getRunwayApiOrigin(): string {
  try {
    return new URL(getRunwayApiBase()).origin;
  } catch {
    return 'https://api.dev.runwayml.com';
  }
}

export function getRunwayApiSecret(): string {
  const key = process.env.RUNWAYML_API_SECRET?.trim();
  if (!key) {
    throw new Error(
      'RUNWAYML_API_SECRET is not configured. Set it in the environment or plugin config.',
    );
  }
  return key;
}

export function resolveRunwaySecretFromRuntime(
  runtime: { getSetting?: (k: string) => string | null | undefined },
): string {
  const fromSetting = runtime.getSetting?.('RUNWAYML_API_SECRET')?.trim();
  const fromEnv = process.env.RUNWAYML_API_SECRET?.trim();
  const key = fromSetting || fromEnv;
  if (!key) {
    throw new Error(
      'RUNWAYML_API_SECRET is not configured (runtime setting or RUNWAYML_API_SECRET env).',
    );
  }
  return key;
}
