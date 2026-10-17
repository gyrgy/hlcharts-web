/**
 * A perp's settings as the build reads them from Hyperliquid's market list:
 * only what changes when its exchange changes it (leverage, margin, funding
 * parameters, open-interest cap), never the hour's figures. For the pages'
 * <noscript> tables, read by search engines and AI crawlers that run no
 * JavaScript: no live number is ever written into the HTML, so none can go
 * stale there (owner, 2026-10-16).
 */
import { PerpPage } from '../build/build-markets';
import { impactNotionalUsd } from '../book/impact-notional';
import { FundingParams } from '../funding/explain-funding';
import { fundingParams } from '../funding/funding-params';
import { MAIN_DEX, MARGIN_MODE } from '../hl/constants';
import { PerpMarketMeta } from '../hl/types';

export interface PerpSettings {
  /** The coin without its exchange prefix ("TSLA" for "xyz:TSLA"). */
  coin: string;
  path: string;
  /** The exchange's id: '' for the main exchange. */
  dex: string;
  maxLeverage: number;
  isolatedOnly: boolean;
  delisted: boolean;
  funding: FundingParams;
  /** The builder exchange's cap on the market's open interest, USD; null on the main exchange (not published). */
  oiCapUsd: number | null;
  /** The trade size Hyperliquid measures the impact spread at; null where it does not publish it. */
  impactSizeUsd: number | null;
  deployerFeeScale: string | null;
}

export const isolatedOnly = (m: PerpMarketMeta): boolean =>
  m.onlyIsolated === true ||
  m.marginMode === MARGIN_MODE.strictIsolated ||
  m.marginMode === MARGIN_MODE.noCross;

export function perpSettings(page: PerpPage): PerpSettings {
  const { market, dex } = page;
  const main = market.dex === MAIN_DEX;
  const cap = dex?.assetToStreamingOiCap.find(([c]) => c === market.name)?.[1];
  return {
    coin: main ? market.name : market.name.slice(market.dex.length + 1),
    path: page.path,
    dex: market.dex,
    maxLeverage: market.maxLeverage,
    isolatedOnly: isolatedOnly(market),
    delisted: market.isDelisted === true,
    funding: fundingParams(market.dex, market.name, {
      interest: dex?.assetToFundingInterestRate,
      clamp: dex?.assetToFundingClamp,
      multiplier: dex?.assetToFundingMultiplier,
    }),
    oiCapUsd: cap === undefined ? null : Number(cap),
    impactSizeUsd: impactNotionalUsd(market.dex, market.name),
    deployerFeeScale: main ? null : (market.deployerFeeScale ?? null),
  };
}
