/** One row of the markets table: a perp on any exchange, or a spot pair. Numbers, not strings: the table sorts them. */
export interface MarketRow {
  /** Unique: the API's coin id ("BTC", "xyz:TSLA", "@107"). */
  key: string;
  kind: 'perp' | 'spot';
  /** '' for the main exchange; the builder exchange's name; 'spot'. */
  venue: string;
  /** What people read: "BTC", "TSLA", "HYPE/USDC". */
  name: string;
  /** The market's page (market-paths.ts: the same rules as the build). */
  href: string;
  /** The asset, for matching the same asset across venues: "BTC", "TSLA", "HYPE". */
  base: string;
  markPx: number;
  change24h: number | null;
  /** 24 h traded value in the quote currency (USD or a USD stablecoin). */
  volume24h: number;
  /** Open interest in contracts, and in dollars. */
  oiCoins: number | null;
  oiUsd: number | null;
  /** Funding per hour, as a fraction (0.0000125 = 0.00125%). */
  fundingHourly: number | null;
  premium: number | null;
  /** Mark against oracle, in basis points. */
  basisBps: number | null;
  /** Spread between the impact prices (cost to trade at Hyperliquid's impact size), basis points; perps only. */
  impactSpreadBps: number | null;
  maxLeverage: number | null;
  /** Builder exchanges: open interest / the market's cap. */
  capUse: number | null;
  /** Main exchange: on Hyperliquid's at-cap list. */
  atCap: boolean;
  delisted: boolean;
  isolatedOnly: boolean;
  /** Main exchange: Binance's and Bybit's predicted funding, per hour (their own interval divided out). */
  binanceHourly: number | null;
  bybitHourly: number | null;
  /** Hyperliquid's funding minus the average of Binance's and Bybit's, per hour. */
  cexGapHourly: number | null;
  /** Other venues listing the same asset at a price within SIBLING_PRICE_TOLERANCE ("main", "xyz", "spot"). */
  alsoOn: string[];
  /** Open interest in contracts against this browser's remembered figure (opt-in). */
  oiChange: number | null;
  /**
   * Spot only: the quote token's id. A spot pair's price and volume are in
   * this token (USDC for 313 of 330 pairs on 2026-10-04, otherwise USDT0, USDE
   * or USDH), so sums across pairs keep to one quote token.
   */
  quoteToken?: number;
}

/** The fields every builder fills in later steps (enrichment), defaulted here. */
export const ENRICHED_DEFAULTS = {
  binanceHourly: null,
  bybitHourly: null,
  cexGapHourly: null,
  alsoOn: [] as string[],
  oiChange: null,
} satisfies Partial<MarketRow>;
