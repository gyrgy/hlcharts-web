/**
 * Assets listed as perps on more than one exchange (plan §3.3,
 * /exchanges/compare), by the market pages' sibling rules: same name and a
 * price within 2% of the market with the most open interest under that name.
 * A same-named market further off is a different asset and is listed apart
 * (main STX $0.38 against para:STX $840, 2026-10-04).
 */
import { comparable, isNameOnly, isSibling } from '../markets/sibling-rules';
import { MarketRow } from '../markets/types';

export interface SharedAsset {
  base: string;
  /** The same asset, largest open interest first. */
  markets: MarketRow[];
  totalOiUsd: number;
}

export interface SameNameOnly {
  base: string;
  /** Same name, prices more than 2% apart: different assets. */
  markets: MarketRow[];
}

export function sharedAssets(rows: readonly MarketRow[]): {
  shared: SharedAsset[];
  nameOnly: SameNameOnly[];
} {
  const byBase = new Map<string, MarketRow[]>();
  for (const r of rows) {
    if (r.kind !== 'perp' || !comparable(r)) continue;
    byBase.set(r.base, [...(byBase.get(r.base) ?? []), r]);
  }
  const shared: SharedAsset[] = [];
  const nameOnly: SameNameOnly[] = [];
  for (const [base, list] of byBase) {
    if (list.length < 2) continue;
    const sorted = [...list].sort((a, b) => (b.oiUsd ?? 0) - (a.oiUsd ?? 0));
    const anchor = sorted[0];
    const same = [anchor, ...sorted.slice(1).filter((r) => isSibling(anchor, r))];
    const different = sorted.slice(1).filter((r) => isNameOnly(anchor, r));
    if (same.length >= 2) {
      shared.push({
        base,
        markets: same,
        totalOiUsd: same.reduce((s, r) => s + (r.oiUsd ?? 0), 0),
      });
    }
    if (different.length) nameOnly.push({ base, markets: [anchor, ...different] });
  }
  shared.sort((a, b) => b.totalOiUsd - a.totalOiUsd);
  nameOnly.sort((a, b) => a.base.localeCompare(b.base));
  return { shared, nameOnly };
}
