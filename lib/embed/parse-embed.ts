/**
 * What an embed's address asks for, checked before anything is drawn: the
 * market charts need a market, ranges must be ones the chart offers, and a
 * chart without settings takes none. A missing range falls back to the
 * chart's default; anything unknown is refused with a reason, never guessed.
 * Whether the market exists is checked against Hyperliquid's live list by the
 * page itself.
 */
import { ChartId } from '../charts/chart-registry';
import {
  COMPARE_DAYS,
  COMPARE_UNITS,
  CompareDays,
  CompareUnit,
  DEFAULT_FUNDING_RANGE,
  DEFAULT_PRICE_INTERVAL,
  FUNDING_RANGES,
  FundingRange,
  MAX_COMPARE_MARKETS,
  PRICE_INTERVALS,
  PriceInterval,
} from '../charts/ranges';

export type EmbedRequest =
  | { chart: 'market.price'; market: string; interval: PriceInterval }
  | { chart: 'market.funding'; market: string; range: FundingRange }
  | { chart: 'funding.compare'; markets: string[]; days: CompareDays; unit: CompareUnit }
  | { chart: 'funding.histogram' | 'markets.map' | 'oi.treemap' | 'lending.curve' };

export function parseEmbed(chart: ChartId, search: string): EmbedRequest | { error: string } {
  const q = new URLSearchParams(search);
  const m = q.get('m') ?? '';
  const r = q.get('r');
  switch (chart) {
    case 'market.price': {
      if (!m) return { error: 'No market given (?m=…).' };
      const interval =
        r === null ? DEFAULT_PRICE_INTERVAL : PRICE_INTERVALS.find((i) => i.id === r);
      if (!interval) return { error: `Unknown interval "${r}".` };
      return { chart, market: m, interval };
    }
    case 'market.funding': {
      if (!m) return { error: 'No market given (?m=…).' };
      const range = r === null ? DEFAULT_FUNDING_RANGE : FUNDING_RANGES.find((x) => x.id === r);
      if (!range) return { error: `Unknown range "${r}".` };
      return { chart, market: m, range };
    }
    case 'funding.compare': {
      const markets = m.split(',').filter(Boolean);
      if (!markets.length) return { error: 'No markets given (?m=…).' };
      if (markets.length > MAX_COMPARE_MARKETS)
        return { error: `At most ${MAX_COMPARE_MARKETS} markets.` };
      const days = r === null ? COMPARE_DAYS[0] : COMPARE_DAYS.find((d) => String(d) === r);
      if (!days) return { error: `Unknown range "${r}".` };
      const u = q.get('u') ?? COMPARE_UNITS[0];
      const unit = COMPARE_UNITS.find((x) => x === u);
      if (!unit) return { error: `Unknown unit "${u}".` };
      return { chart, markets, days, unit };
    }
    default:
      return { chart };
  }
}
