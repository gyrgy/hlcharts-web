/**
 * Binance's and Bybit's predicted funding on main-exchange rows, per hour.
 * Each venue quotes its rate for its own interval (1, 4 or 8 hours on
 * 2026-10-04), so the interval is divided out; an entry without an interval is
 * left missing rather than assumed to be 8-hourly. The gap is Hyperliquid's
 * hourly funding minus the average of the CEX rates present.
 */
import { FUNDING_VENUE, MAIN_DEX } from '../hl/constants';
import { PredictedFundings } from '../hl/types';
import { MarketRow } from './types';

export function withPredictedFunding(
  rows: MarketRow[],
  predicted: PredictedFundings | null
): MarketRow[] {
  if (!predicted) return rows;
  const hourly = new Map<string, Record<string, number>>();
  for (const [coin, venues] of predicted) {
    const byVenue: Record<string, number> = {};
    for (const [venue, d] of venues) {
      const hours = d?.fundingIntervalHours;
      const rate = Number(d?.fundingRate);
      if (d && hours && hours > 0 && Number.isFinite(rate)) byVenue[venue] = rate / hours;
    }
    hourly.set(coin, byVenue);
  }
  return rows.map((r) => {
    if (r.kind !== 'perp' || r.venue !== MAIN_DEX) return r;
    const v = hourly.get(r.key);
    const binance = v?.[FUNDING_VENUE.binance] ?? null;
    const bybit = v?.[FUNDING_VENUE.bybit] ?? null;
    const cex = [binance, bybit].filter((x): x is number => x !== null);
    const gap =
      r.fundingHourly !== null && cex.length
        ? r.fundingHourly - cex.reduce((a, b) => a + b, 0) / cex.length
        : null;
    return { ...r, binanceHourly: binance, bybitHourly: bybit, cexGapHourly: gap };
  });
}
