/**
 * Lightweight parsing helpers for natural-language triggers.
 */

export function normalizeText(message: { content?: { text?: string } } | undefined): string {
  return (message?.content?.text ?? '').trim();
}

export function matchesAny(haystack: string, needles: string[]): boolean {
  const h = haystack.toLowerCase();
  return needles.some((n) => h.includes(n.toLowerCase()));
}

/** Returns substring after the first matched keyword, trimmed; falls back to full text. */
export function extractPromptAfterKeyword(text: string, keywords: string[]): string {
  const lower = text.toLowerCase();
  for (const kw of keywords) {
    const i = lower.indexOf(kw.toLowerCase());
    if (i >= 0) {
      const rest = text.slice(i + kw.length).trim();
      if (rest.length > 0) return rest.replace(/^[:,]\s*/, '');
    }
  }
  return text.trim();
}

/** Pull `key:value` or `key="value"` pairs from free text (best-effort). */
export function parseKeyValuePairs(text: string): Record<string, string> {
  const out: Record<string, string> = {};
  const re = /(\w+)\s*[:=]\s*("([^"]+)"|'([^']+)'|(\S+))/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(text)) !== null) {
    const key = m[1].toLowerCase();
    const val = (m[3] ?? m[4] ?? m[5] ?? '').trim();
    if (key && val) out[key] = val;
  }
  return out;
}
