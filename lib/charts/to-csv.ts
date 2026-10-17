/**
 * A chart's numbers as CSV (RFC 4180): a header row, numbers at full
 * precision, missing values empty, and any field holding a comma, quote or
 * line break quoted with its quotes doubled. Only what the chart has on
 * screen: the CSV never reaches beyond the range shown (plan §3.2).
 */
export interface ChartTable {
  columns: string[];
  rows: (string | number | null)[][];
}

const field = (v: string | number | null): string => {
  if (v === null) return '';
  const s = typeof v === 'number' ? (Number.isFinite(v) ? String(v) : '') : v;
  return /[",\r\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
};

export function toCsv(t: ChartTable): string {
  return [t.columns, ...t.rows].map((r) => r.map(field).join(',')).join('\r\n') + '\r\n';
}

/** hlcharts-market.funding-btc-20261005-1412.csv: chart id, what it shows, UTC time. */
export function chartFileName(id: string, tag: string, at: Date, ext: 'csv' | 'png'): string {
  const stamp = at.toISOString().slice(0, 16).replace(/[-:]/g, '').replace('T', '-');
  const safe = tag
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
  return `hlcharts-${id}${safe ? `-${safe}` : ''}-${stamp}.${ext}`;
}

/** UTC time as the tables and CSVs write it: 2026-10-05T14:00:00Z. */
export const utcIso = (ms: number): string => new Date(ms).toISOString().replace('.000Z', 'Z');
