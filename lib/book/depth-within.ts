/**
 * Resting value (USD notional) on one side within `band` of the mid (0.005 =
 * ±0.5%). Null ("not measured") when the ladder does not reach the band's
 * edge on that side: a book that stops short says nothing about what lies
 * beyond it, so the figure is never a 0 and never an extrapolation.
 */
import { Ladder } from './book-ladder';

export function depthWithin(
  ladder: Ladder,
  side: 'bid' | 'ask',
  band: number
): { usd: number; approximate: boolean } | null {
  const levels = side === 'bid' ? ladder.bids : ladder.asks;
  const edge = side === 'bid' ? ladder.mid * (1 - band) : ladder.mid * (1 + band);
  const last = levels[levels.length - 1];
  if (!last) return null;
  const reaches = side === 'bid' ? last.px <= edge : last.px >= edge;
  if (!reaches) return null;
  let usd = 0;
  let approximate = false;
  for (const l of levels) {
    const inside = side === 'bid' ? l.px >= edge : l.px <= edge;
    if (!inside) break;
    usd += l.px * l.sz;
    approximate ||= l.coarse;
  }
  // The skipped bucket between the fine and coarse levels lies inside the band
  // whenever the band reaches past the fine levels.
  const fineLast = [...levels].reverse().find((l) => !l.coarse);
  if (fineLast && (side === 'bid' ? fineLast.px > edge : fineLast.px < edge) && ladder.step)
    approximate = true;
  return { usd, approximate };
}
