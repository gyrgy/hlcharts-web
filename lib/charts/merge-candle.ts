/**
 * Apply one live candle to a series: the feed re-sends the current candle on
 * every trade, so a candle with the last one's open time replaces it, a newer
 * one is appended, and an older one (a late message) is ignored. Never two
 * candles for one period.
 */
import { Candle } from '../hl/types';

export function mergeCandle(series: readonly Candle[], c: Candle): Candle[] {
  const last = series[series.length - 1];
  if (!last || c.t > last.t) return [...series, c];
  if (c.t === last.t) return [...series.slice(0, -1), c];
  return series as Candle[];
}
