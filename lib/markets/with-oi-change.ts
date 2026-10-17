/**
 * Open interest in contracts against the remembered snapshot (contracts, not
 * dollars: a dollar figure would move with the price even when no position
 * changed). Markets missing from the snapshot, or with none remembered, stay
 * missing.
 */
import { OiSnapshot } from './oi-memory';
import { MarketRow } from './types';

export function withOiChange(rows: MarketRow[], previous: OiSnapshot | null): MarketRow[] {
  if (!previous) return rows;
  return rows.map((r) => {
    const before = previous.oi[r.key];
    if (r.oiCoins === null || !(before > 0)) return r;
    return { ...r, oiChange: r.oiCoins / before - 1 };
  });
}
