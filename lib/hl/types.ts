/** Shapes of Hyperliquid's replies used by the site (amounts are decimal strings). */

export interface PerpAssetCtx {
  funding: string;
  openInterest: string;
  prevDayPx: string;
  dayNtlVlm: string;
  premium: string | null;
  oraclePx: string;
  markPx: string;
  midPx: string | null;
  impactPxs: [string, string] | null;
  dayBaseVlm: string;
}

export interface PerpMarketMeta {
  name: string;
  szDecimals: number;
  maxLeverage: number;
  marginTableId?: number;
  isDelisted?: boolean;
  onlyIsolated?: boolean;
  marginMode?: string;
  growthMode?: string;
  deployerFeeScale?: string;
  /** The deployer's last fee-scale change: UTC with no zone and nanoseconds, "1970-01-01T00:00:00" for never (lib/listings/fee-scale-time.ts). */
  lastFeeScaleChangeTime?: string;
}

export interface PerpMeta {
  universe: PerpMarketMeta[];
}

/**
 * A leverage table: max leverage by position size (docs, margin tiers: the
 * bound is the position's notional value in USDC; BTC 40x up to 150M, 20x
 * above, 2026-10-04). A market whose marginTableId is not listed has one tier
 * at its maxLeverage: the id equalled maxLeverage for all 292 such live
 * markets that day.
 */
export interface MarginTable {
  description: string;
  marginTiers: { lowerBound: string; maxLeverage: number }[];
}

/** allPerpMetas: one entry per exchange, in perpDexs order (main first). */
export interface PerpMetaWithCollateral extends PerpMeta {
  collateralToken: number;
  marginTables?: [number, MarginTable][];
}

/**
 * perpDeployAuctionStatus: the Dutch auction for listing an additional perp,
 * shared by all builder exchanges. Gas in HYPE (docs, HIP-1: 31 hours, falling
 * linearly to 500 HYPE from twice the last price, or from 500 if the last
 * auction failed). endGas is null while no one has bought.
 */
export interface PerpDeployAuctionStatus {
  startTimeSeconds: number;
  durationSeconds: number;
  startGas: string;
  currentGas: string;
  endGas: string | null;
}

/** perpDexs: null for the main exchange, then one entry per builder exchange. */
export interface PerpDex {
  name: string;
  fullName: string;
  deployer: string;
  oracleUpdater: string | null;
  feeRecipient: string | null;
  assetToStreamingOiCap: [string, string][];
  assetToFundingMultiplier: [string, string][];
  assetToFundingInterestRate: [string, string][];
  assetToFundingClamp: [string, string][];
  /** Addresses the deployer allows to perform one action each (setOracle, haltTrading, ...). */
  subDeployers?: [string, string[]][];
}

export interface SpotMeta {
  universe: { tokens: [number, number]; name: string; index: number; isCanonical: boolean }[];
  tokens: {
    name: string;
    szDecimals: number;
    weiDecimals: number;
    index: number;
    isCanonical: boolean;
  }[];
}

export type MetaAndAssetCtxs = [PerpMeta, PerpAssetCtx[]];

/**
 * predictedFundings: per coin, per venue, the next funding rate for that
 * venue's own interval (1, 4 or 8 hours on 2026-10-04). null where the venue
 * does not list the coin; some entries carry no interval (Binance, rate 0.0:
 * not listed there any more).
 */
export type PredictedFundings = [
  string,
  [
    string,
    { fundingRate: string; nextFundingTime: number; fundingIntervalHours?: number } | null,
  ][],
][];

/** candleSnapshot rows and the candle feed (trade prices; t = open time in ms). */
export interface Candle {
  t: number;
  T: number;
  s: string;
  i: string;
  o: string;
  c: string;
  h: string;
  l: string;
  v: string;
  n: number;
}

/** fundingHistory rows: the hourly rate actually applied, and that hour's premium. */
export interface FundingRow {
  coin: string;
  fundingRate: string;
  premium: string;
  time: number;
}

export interface SpotAssetCtx {
  /** The pair's name in spotMeta ("PURR/USDC", "@107"), or a prediction market ("#…") or a former pair ("@71"). */
  coin: string;
  prevDayPx: string;
  dayNtlVlm: string;
  markPx: string;
  midPx: string | null;
  circulatingSupply: string;
  totalSupply: string;
  dayBaseVlm: string;
}

/**
 * Spot pairs and contexts. The contexts are NOT in pair order and include
 * more than the pairs (2026-10-04: 330 pairs, 1,003 contexts: also 610
 * prediction markets and 63 former pairs): match them by `coin`.
 */
export type SpotMetaAndAssetCtxs = [
  SpotMeta & { tokens: { name: string; index: number }[] },
  SpotAssetCtx[],
];

export interface AllDexsAssetCtxs {
  ctxs: [string, PerpAssetCtx[]][];
}

export type FastAssetCtxs = Record<string, { markPx?: string; midPx?: string }>;

export interface BookLevel {
  px: string;
  sz: string;
  n: number;
}

export interface L2Book {
  coin: string;
  time: number;
  levels: [BookLevel[], BookLevel[]];
}

export interface WsMessage<T = unknown> {
  channel: string;
  data: T;
}

/** One token's lending state (allBorrowLendReserveStates, 2026-10-04): amounts in tokens, rates per year. */
export interface BorrowLendReserveState {
  borrowYearlyRate: string;
  supplyYearlyRate: string;
  /** Not documented; within a few units of supplied − borrowed on 2026-10-04. Not shown. */
  balance: string;
  /** Borrowed ÷ supplied (equal to 10 decimals on 2026-10-04). */
  utilization: string;
  oraclePx: string;
  /** 0 for the stablecoins; 0.65 HYPE and 0.5 BTC on 2026-10-04, as the docs state. */
  ltv: string;
  totalSupplied: string;
  totalBorrowed: string;
}

export type AllBorrowLendReserveStates = [number, BorrowLendReserveState][];

/**
 * perpDexLimits for one builder exchange. totalOiCap is the exchange-wide
 * notional cap in USD (docs: notional caps apply to the exchange's total and
 * per market); coinToOiCap equalled perpDexs' per-market caps on all 10
 * exchanges (2026-10-04). The size cap and maxTransferNtl are not documented
 * in a way we can explain, and are not shown.
 */
export interface PerpDexLimits {
  totalOiCap: string;
  oiSzCapPerPerp: string;
  maxTransferNtl: string;
  coinToOiCap: [string, string][];
}

/**
 * The fee schedule inside a userFees reply (2026-10-05). Rates are fractions.
 * Tiers by 14-day weighted volume in USD (perps + 2 x spot, docs: fees);
 * maker rebates by share of maker volume; staking discounts by HYPE staked,
 * in basis points of HYPE's maximum supply (0.0001 = 10 HYPE).
 */
export interface FeeSchedule {
  cross: string;
  add: string;
  spotCross: string;
  spotAdd: string;
  referralDiscount: string;
  tiers: {
    vip: { ntlCutoff: string; cross: string; add: string; spotCross: string; spotAdd: string }[];
    mm: { makerFractionCutoff: string; add: string }[];
  };
  stakingDiscountTiers: { bpsOfMaxSupply: string; discount: string }[];
}

export interface UserFees {
  feeSchedule: FeeSchedule;
}
