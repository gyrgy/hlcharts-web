/** "Also on": the other venues listing the same asset, by the rules in sibling-rules.ts. */
import { comparable, isSibling, siblingVenue } from './sibling-rules';
import { MarketRow } from './types';

export function withSiblings(rows: MarketRow[]): MarketRow[] {
  const byBase = new Map<string, MarketRow[]>();
  for (const r of rows) {
    if (!comparable(r)) continue;
    const list = byBase.get(r.base) ?? [];
    list.push(r);
    byBase.set(r.base, list);
  }
  return rows.map((r) => {
    const venues = new Set(
      (byBase.get(r.base) ?? []).filter((o) => isSibling(r, o)).map(siblingVenue)
    );
    return venues.size ? { ...r, alsoOn: [...venues].sort() } : r;
  });
}
