/** The snapshot to remember now: open interest in contracts of every perp row (oi-memory.ts). */
import { OiSnapshot } from './oi-memory';
import { MarketRow } from './types';
export function oiSnapshot(rows: readonly MarketRow[], at: number): OiSnapshot {
  const oi: Record<string, number> = {};
  for (const r of rows) if (r.oiCoins !== null && r.oiCoins > 0) oi[r.key] = r.oiCoins;
  return { at, oi };
}
