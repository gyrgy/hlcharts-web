/**
 * How Hyperliquid splits a TWAP order, for the docs' own case (order types,
 * read 2026-10-05): suborders every 30 seconds, "a $10,000 order over 1 hour
 * creates ~121 suborders of ~$83", each limited to 3% slippage, and a missed
 * fill caught up later at no more than 3 times the normal suborder size.
 * Longer runs send suborders less often (4 days: ~1,000, roughly every 6
 * minutes); that rule is not stated exactly, so only runs that keep the
 * 30-second interval are planned here.
 */
export const TWAP_INTERVAL_S = 30;
export const TWAP_MAX_SLIPPAGE = 0.03;
export const TWAP_CATCH_UP_LIMIT = 3;
/** The longest run the docs' examples show at the 30-second interval: one hour. */
export const TWAP_MAX_PLANNED_S = 3600;

export interface TwapPlan {
  suborders: number;
  suborderUsd: number;
  intervalS: number;
}

export function twapPlan(totalUsd: number, durationS: number): TwapPlan {
  if (!(durationS > 0 && durationS <= TWAP_MAX_PLANNED_S)) {
    throw new Error(`twapPlan: ${durationS} s is outside the runs the docs' examples cover`);
  }
  const suborders = Math.floor(durationS / TWAP_INTERVAL_S) + 1;
  return { suborders, suborderUsd: totalUsd / suborders, intervalS: TWAP_INTERVAL_S };
}
