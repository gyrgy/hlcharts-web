/**
 * `/listings` (plan §3.3): every perp on every exchange, delisted ones
 * included, in Hyperliquid's own order, with how it may be margined, its
 * leverage tiers, its fee settings and, on the main exchange, whether
 * Hyperliquid lists it at its open-interest cap. Built from perpDexs and
 * allPerpMetas, which must line up by position (as in LiveUniverse).
 */
import { GROWTH_MODE_ENABLED, MAIN_DEX, MARGIN_MODE } from '../hl/constants';
import { PerpDex, PerpMarketMeta, PerpMetaWithCollateral } from '../hl/types';
import { perpPath } from '../markets/market-paths';
import { feeScaleChangedAt } from './fee-scale-time';

/** cross: cross margin allowed; isolated: isolated only; isolatedLocked: isolated only, margin cannot be withdrawn. */
export type MarginRule = 'cross' | 'isolated' | 'isolatedLocked';

export interface ListingRow {
  key: string;
  name: string;
  href: string;
  delisted: boolean;
  maxLeverage: number;
  /** Max leverage from each position size (notional, USDC) up. */
  tiers: { fromUsd: number; maxLeverage: number }[];
  margin: MarginRule;
  growthMode: boolean;
  feeScale: number | null;
  feeScaleChangedAt: number | null;
  atCap: boolean;
}

export interface ExchangeListing {
  dex: string;
  fullName: string | null;
  deployer: string | null;
  live: number;
  delisted: number;
  markets: ListingRow[];
}

function marginRule(m: PerpMarketMeta): MarginRule {
  if (m.marginMode === MARGIN_MODE.strictIsolated) return 'isolatedLocked';
  if (m.marginMode === MARGIN_MODE.noCross || m.onlyIsolated) return 'isolated';
  return 'cross';
}

export function listings(
  dexes: readonly (PerpDex | null)[],
  metas: readonly PerpMetaWithCollateral[],
  atCap: ReadonlySet<string>
): ExchangeListing[] {
  if (dexes.length !== metas.length) {
    throw new Error(`listings: ${dexes.length} exchanges but ${metas.length} market lists`);
  }
  return metas.map((meta, i) => {
    const d = dexes[i];
    const dex = d ? d.name : MAIN_DEX;
    const tables = new Map(meta.marginTables ?? []);
    const markets = meta.universe.map((m): ListingRow => {
      const table = tables.get(m.marginTableId ?? -1);
      const delisted = m.isDelisted === true;
      return {
        key: m.name,
        name: dex === MAIN_DEX ? m.name : m.name.slice(dex.length + 1),
        href: perpPath(dex, m.name),
        delisted,
        maxLeverage: m.maxLeverage,
        tiers: table
          ? table.marginTiers.map((t) => ({
              fromUsd: Number(t.lowerBound),
              maxLeverage: t.maxLeverage,
            }))
          : [{ fromUsd: 0, maxLeverage: m.maxLeverage }],
        margin: marginRule(m),
        growthMode: m.growthMode === GROWTH_MODE_ENABLED,
        feeScale: m.deployerFeeScale === undefined ? null : Number(m.deployerFeeScale),
        feeScaleChangedAt: feeScaleChangedAt(m.lastFeeScaleChangeTime),
        atCap: dex === MAIN_DEX && !delisted && atCap.has(m.name),
      };
    });
    const delisted = markets.filter((m) => m.delisted).length;
    return {
      dex,
      fullName: d?.fullName ?? null,
      deployer: d?.deployer ?? null,
      live: markets.length - delisted,
      delisted,
      markets,
    };
  });
}
