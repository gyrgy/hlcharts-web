/**
 * The ranges the charts offer, in one place: the charts' buttons and the embed
 * pages' address check both read them, so an embed can only ask for a range
 * the chart has.
 */
const DAY = 86_400_000;

/** Price candles: each interval's span stays within Hyperliquid's ~5,000 candles per request (1 min x 1 day = 1,440). */
export const PRICE_INTERVALS = [
  { id: '1m', label: '1 min', span: DAY, axis: 'one-minute candles, last 24 h' },
  { id: '15m', label: '15 min', span: 7 * DAY, axis: '15-minute candles, last 7 days' },
  { id: '1h', label: '1 hour', span: 30 * DAY, axis: 'hourly candles, last 30 days' },
  { id: '1d', label: '1 day', span: 3 * 365 * DAY, axis: 'daily candles, up to 3 years' },
] as const;
export type PriceInterval = (typeof PRICE_INTERVALS)[number];
export const DEFAULT_PRICE_INTERVAL: PriceInterval = PRICE_INTERVALS[1];

/** One market's funding history. */
export const FUNDING_RANGES = [
  { id: '7d', label: '7 days', days: 7 },
  { id: '21d', label: '21 days', days: 21 },
  { id: '90d', label: '90 days', days: 90 },
] as const;
export type FundingRange = (typeof FUNDING_RANGES)[number];
export const DEFAULT_FUNDING_RANGE: FundingRange = FUNDING_RANGES[0];

/** Several markets' funding history, in days. */
export const COMPARE_DAYS = [7, 21, 90] as const;
export type CompareDays = (typeof COMPARE_DAYS)[number];
export const COMPARE_UNITS = ['year', 'hour'] as const;
export type CompareUnit = (typeof COMPARE_UNITS)[number];
export const MAX_COMPARE_MARKETS = 10;
