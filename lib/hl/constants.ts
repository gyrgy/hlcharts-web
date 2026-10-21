/**
 * Hyperliquid's public API as the site uses it, from the visitor's browser.
 * Formats checked live 2026-10-04 (scripts/hlcharts/feed-sample.js in coin-trader).
 */
export const HL_INFO_URL = 'https://api.hyperliquid.xyz/info';
export const HL_WS_URL = 'wss://api.hyperliquid.xyz/ws';

export const FEED = {
  /** Every perp context on every exchange, ~every 15 s: data.ctxs = [dex, rows][], rows without names. */
  allDexsAssetCtxs: 'allDexsAssetCtxs',
  /** Mark and mid changes for every market, ~every 1 s: data = base64 raw-deflate JSON {coin: {markPx?, midPx?}}. */
  fastAssetCtxs: 'fastAssetCtxs',
  /** One coin's book: data.levels = [bids, asks], 20 levels each. */
  l2Book: 'l2Book',
  /** One coin's trades: data = [{coin, side, px, sz, time, tid, users}]; never show users. */
  trades: 'trades',
  /** One coin's current candle at one interval, re-sent on every trade: data = {t, s (coin), i (interval), o, h, l, c, v, n}. */
  candle: 'candle',
} as const;
export type FeedName = (typeof FEED)[keyof typeof FEED];

export const INFO = {
  metaAndAssetCtxs: 'metaAndAssetCtxs',
  allPerpMetas: 'allPerpMetas',
  perpDexs: 'perpDexs',
  spotMeta: 'spotMeta',
  spotMetaAndAssetCtxs: 'spotMetaAndAssetCtxs',
  /** Candles: ascending, at most the latest ~5,000 per request (2026-10-04). */
  candleSnapshot: 'candleSnapshot',
  /** Hourly funding and premium: ascending, the FIRST 500 hours from startTime, not the latest (2026-10-04). */
  fundingHistory: 'fundingHistory',
  /** Main-exchange markets at their open-interest cap; includes delisted ones (all 7 on 2026-10-04). */
  perpsAtOpenInterestCap: 'perpsAtOpenInterestCap',
  /** Predicted funding on Hyperliquid, Binance and Bybit, main-exchange coins only (234 on 2026-10-04). */
  predictedFundings: 'predictedFundings',
  /** The lending market: [token id, state] for 5 tokens on 2026-10-04; amounts in tokens. Weight 20. */
  allBorrowLendReserveStates: 'allBorrowLendReserveStates',
  /** The perp listing auction (see PerpDeployAuctionStatus). Weight 20. */
  perpDeployAuctionStatus: 'perpDeployAuctionStatus',
  /** One builder exchange's caps (see PerpDexLimits). Weight 20 per exchange. */
  perpDexLimits: 'perpDexLimits',
  /**
   * An address's fees, with the full fee schedule. Asked for the zero address
   * (no one's account), it returns the schedule alone (2026-10-05).
   */
  userFees: 'userFees',
} as const;

/** No one's address: asks userFees for the fee schedule without involving any account. */
export const ZERO_ADDRESS = '0x0000000000000000000000000000000000000000';

/** The most a builder (a front-end) may charge on a fill: docs, builder codes, read 2026-10-05. */
export const BUILDER_FEE_MAX = { perp: 0.001, spot: 0.01 } as const;

/** HIP-1 / HIP-3 deploy auction floor (docs, HIP-1, read 2026-10-04). */
export const DEPLOY_AUCTION_FLOOR_HYPE = 500;
/** Margin modes (docs, info endpoint): isolated only; isolated only and margin cannot be withdrawn. */
export const MARGIN_MODE = { noCross: 'noCross', strictIsolated: 'strictIsolated' } as const;
export const GROWTH_MODE_ENABLED = 'enabled';

/** Venue ids in predictedFundings. */
export const FUNDING_VENUE = {
  hyperliquid: 'HlPerp',
  binance: 'BinPerp',
  bybit: 'BybitPerp',
} as const;

/** Token id of USDC in spotMeta (pairs name tokens by id, which is not their position in the list). */
export const USDC_TOKEN_ID = 0;

/** The main exchange's name in the per-exchange lists ('' in allDexsAssetCtxs). */
export const MAIN_DEX = '';
/** Significant figures for the wide book: BTC at 3 gave 20 levels of $100, about ±2.3% (2026-10-04). */
export const BOOK_COARSE_N_SIG_FIGS = 3;
/** The book between the live levels and the wide one (lib/book/book-figures.ts). */
export const BOOK_MIDDLE_N_SIG_FIGS = 4;
/**
 * The size Hyperliquid measures a main-exchange perp's impact prices at
 * (contract specifications, read 2026-10-04); builder exchanges do not publish
 * theirs. Live check the same day: on 22 main perps the impact prices matched
 * the average fill for $6,000 to within ~1 bp.
 */
export const MAIN_IMPACT_NOTIONAL_USD = { large: 20_000, other: 6_000 } as const;
export const MAIN_IMPACT_LARGE_COINS: readonly string[] = ['BTC', 'ETH'];
