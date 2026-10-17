/**
 * Funding across markets, per year, in bins that widen away from zero: on
 * 2026-10-04 rates ran from −469% to +540% a year while, of 330 live perps,
 * 154 sat at exactly 10.95% and 37 at 5.48% (the main exchange's and xyz's
 * base rates).
 * Each bin counts markets at their base rate ("band") apart from those whose
 * rate the premium sets, so the spike reads as what it is.
 */
import { FundingExplanation } from './explain-funding';

/** Per year. Bins: below the first edge, between edges, at or above the last. */
export const FUNDING_BIN_EDGES = [-1, -0.5, -0.2, -0.1, 0, 0.1, 0.2, 0.5, 1];

export interface FundingBin {
  /** Null = open-ended. */
  low: number | null;
  high: number | null;
  atBase: number;
  premiumSet: number;
}

export function fundingHistogram(
  rows: readonly { fundingHourly: number | null; state: FundingExplanation['state'] }[]
): FundingBin[] {
  const edges = FUNDING_BIN_EDGES;
  const bins: FundingBin[] = [null, ...edges].map((low, i) => ({
    low,
    high: i < edges.length ? edges[i] : null,
    atBase: 0,
    premiumSet: 0,
  }));
  for (const r of rows) {
    if (r.fundingHourly === null || !Number.isFinite(r.fundingHourly)) continue;
    const yearly = r.fundingHourly * 24 * 365;
    const i = edges.filter((e) => yearly >= e).length;
    if (r.state === 'band') bins[i].atBase++;
    else bins[i].premiumSet++;
  }
  return bins;
}
