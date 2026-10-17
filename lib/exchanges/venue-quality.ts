/**
 * How each exchange's live perps trade right now, for /exchanges/compare:
 * the median impact spread (cost of a set round trip; sizes differ, see
 * lib/book/impact-notional.ts), the median gap between mark and oracle price,
 * and the share of markets at their base funding rate this hour. Medians, so
 * one odd market does not decide an exchange's figure.
 */
import { FundingBoardRow } from '../funding/funding-board';

export interface VenueQuality {
  venue: string;
  markets: number;
  medianImpactSpreadBps: number | null;
  medianAbsBasisBps: number | null;
  atBaseShare: number | null;
}

function median(xs: number[]): number | null {
  const s = xs.filter((x) => Number.isFinite(x)).sort((a, b) => a - b);
  if (!s.length) return null;
  const m = Math.floor(s.length / 2);
  return s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2;
}

export function venueQuality(board: readonly FundingBoardRow[]): Map<string, VenueQuality> {
  const by = new Map<string, FundingBoardRow[]>();
  for (const r of board) by.set(r.venue, [...(by.get(r.venue) ?? []), r]);
  const out = new Map<string, VenueQuality>();
  for (const [venue, rows] of by) {
    out.set(venue, {
      venue,
      markets: rows.length,
      medianImpactSpreadBps: median(
        rows.flatMap((r) => (r.impactSpreadBps === null ? [] : [r.impactSpreadBps]))
      ),
      medianAbsBasisBps: median(
        rows.flatMap((r) => (r.basisBps === null ? [] : [Math.abs(r.basisBps)]))
      ),
      atBaseShare: rows.length ? rows.filter((r) => r.state === 'band').length / rows.length : null,
    });
  }
  return out;
}
