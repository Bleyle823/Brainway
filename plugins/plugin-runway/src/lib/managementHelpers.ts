/**
 * Summaries for chat callbacks (avoid huge JSON dumps).
 */

const MAX_DOC_CONTENT_PREVIEW = 1500;

export function truncateText(text: string, max = MAX_DOC_CONTENT_PREVIEW): string {
  if (text.length <= max) return text;
  return `${text.slice(0, max)}…\n\n_(truncated; ${text.length} characters total)_`;
}

function isRecord(v: unknown): v is Record<string, unknown> {
  return typeof v === 'object' && v !== null && !Array.isArray(v);
}

export function formatOrganizationSummary(data: unknown): string {
  if (!isRecord(data)) return JSON.stringify(data, null, 2);
  const lines: string[] = ['## Runway organization'];
  if (typeof data.creditBalance === 'number') {
    const usd = (data.creditBalance * 0.01).toFixed(2);
    lines.push(`**Credit balance:** ${data.creditBalance} credits (~$${usd})`);
  }
  if (isRecord(data.tier) && typeof data.tier.maxMonthlyCreditSpend === 'number') {
    lines.push(`**Monthly spend cap:** ${data.tier.maxMonthlyCreditSpend} credits`);
  }
  if (isRecord(data.usage) && isRecord(data.usage.models)) {
    lines.push('');
    lines.push('### Usage today (by model)');
    for (const [model, m] of Object.entries(data.usage.models)) {
      if (isRecord(m) && typeof m.dailyGenerations === 'number') {
        lines.push(`- **${model}:** ${m.dailyGenerations} generations (last 24h rollup)`);
      }
    }
  }
  if (isRecord(data.tier) && isRecord(data.tier.models)) {
    lines.push('');
    lines.push('### Tier limits (sample)');
    let n = 0;
    for (const [model, m] of Object.entries(data.tier.models)) {
      if (n >= 12) break;
      if (isRecord(m)) {
        const c = m.maxConcurrentGenerations;
        const d = m.maxDailyGenerations;
        if (typeof c === 'number' && typeof d === 'number') {
          lines.push(`- **${model}:** concurrency ${c}, daily cap ${d}`);
          n++;
        }
      }
    }
  }
  return lines.join('\n');
}

export function formatUsageHistorySummary(data: unknown): string {
  if (!isRecord(data) || !Array.isArray(data.results)) {
    return JSON.stringify(data, null, 2);
  }
  const lines: string[] = ['## Runway credit usage'];
  let total = 0;
  for (const row of data.results) {
    if (!isRecord(row) || typeof row.date !== 'string' || !Array.isArray(row.usedCredits)) {
      continue;
    }
    lines.push(`\n**${row.date}**`);
    for (const uc of row.usedCredits) {
      if (isRecord(uc) && typeof uc.model === 'string' && typeof uc.amount === 'number') {
        lines.push(`- ${uc.model}: ${uc.amount} credits`);
        total += uc.amount;
      }
    }
  }
  lines.push(`\n**Total (sum of rows shown):** ${total} credits`);
  return lines.join('\n');
}

export function formatVoiceListItems(items: unknown[]): string {
  if (items.length === 0) return 'No custom voices found.';
  const lines = ['## Runway voices', '| id | name | status |', '| --- | --- | --- |'];
  for (const v of items) {
    if (!isRecord(v) || typeof v.id !== 'string') continue;
    const name = typeof v.name === 'string' ? v.name : '—';
    const status = typeof v.status === 'string' ? v.status : '—';
    lines.push(`| ${v.id} | ${name} | ${status} |`);
  }
  return lines.join('\n');
}

export function formatWorkflowList(data: unknown): string {
  if (!isRecord(data) || !Array.isArray(data.data)) {
    return JSON.stringify(data, null, 2);
  }
  const lines = ['## Published workflows', '| workflow | version | id | created |', '| --- | --- | --- | --- |'];
  for (const group of data.data) {
    if (!isRecord(group) || typeof group.name !== 'string' || !Array.isArray(group.versions)) {
      continue;
    }
    for (const ver of group.versions) {
      if (!isRecord(ver)) continue;
      const id = typeof ver.id === 'string' ? ver.id : '?';
      const version = typeof ver.version === 'number' ? String(ver.version) : '?';
      const createdAt = typeof ver.createdAt === 'string' ? ver.createdAt : '—';
      lines.push(`| ${group.name} | ${version} | ${id} | ${createdAt} |`);
    }
  }
  return lines.join('\n');
}

export function formatAvatarListItems(items: unknown[]): string {
  if (items.length === 0) return 'No avatars found.';
  const lines = ['## Runway avatars', '| id | name | status | documents |', '| --- | --- | --- | --- |'];
  for (const a of items) {
    if (!isRecord(a) || typeof a.id !== 'string') continue;
    const name = typeof a.name === 'string' ? a.name : '—';
    const status = typeof a.status === 'string' ? a.status : '—';
    const docs = Array.isArray(a.documentIds) ? String(a.documentIds.length) : '—';
    lines.push(`| ${a.id} | ${name} | ${status} | ${docs} |`);
  }
  return lines.join('\n');
}

export function formatDocumentListItems(items: unknown[]): string {
  if (items.length === 0) return 'No documents found.';
  const lines = ['## Runway documents', '| id | name | type | updated |', '| --- | --- | --- | --- |'];
  for (const d of items) {
    if (!isRecord(d) || typeof d.id !== 'string') continue;
    const name = typeof d.name === 'string' ? d.name : '—';
    const type = typeof d.type === 'string' ? d.type : '—';
    const updated = typeof d.updatedAt === 'string' ? d.updatedAt : '—';
    lines.push(`| ${d.id} | ${name} | ${type} | ${updated} |`);
  }
  return lines.join('\n');
}

export function confirmDeleteApproved(text: string, kv: Record<string, string>): boolean {
  const t = text.toLowerCase();
  if ((kv.confirm || '').toLowerCase() === 'true') return true;
  if (t.includes('confirm delete') || t.includes('confirm:true')) return true;
  return false;
}

export function parseCommaIds(raw: string | undefined): string[] | undefined {
  if (!raw) return undefined;
  const parts = raw
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean);
  return parts.length ? parts : undefined;
}
