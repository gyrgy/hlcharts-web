/**
 * `/exchanges` (plan §3.3): one row per exchange in perpDexs, live figures
 * summed over its live markets. Exchanges with no live market stay, with
 * zeros. Builder exchanges also get their share of all builder-exchange open
 * interest, their exchange-wide cap and how full it is (one-sided open
 * interest, as on /open-interest), and the other exchanges run from the same
 * deployer address.
 */
import { MAIN_DEX } from '../hl/constants';
import { ExchangeListing } from '../listings/listings';
import { exchangePath } from '../markets/market-paths';
import { MarketRow } from '../markets/types';
import { NEAR_CAP } from '../oi/near-cap';

export interface ExchangeSummary {
  dex: string;
  href: string;
  fullName: string | null;
  deployer: string | null;
  live: number;
  delisted: number;
  oiUsd: number;
  volume24h: number;
  /** Share of all builder-exchange open interest; null for the main exchange. */
  builderShare: number | null;
  totalCapUsd: number | null;
  capUse: number | null;
  /** Main: markets Hyperliquid lists at cap; builders: markets at NEAR_CAP or more of their cap. */
  atOrNearCap: number;
  growthModeLive: number;
  sharesDeployerWith: string[];
}

export function exchangeSummaries(
  exchanges: readonly ExchangeListing[],
  rows: readonly MarketRow[],
  totalCaps: ReadonlyMap<string, number>
): ExchangeSummary[] {
  const perps = rows.filter((r) => r.kind === 'perp' && !r.delisted);
  const of = (dex: string) => perps.filter((r) => r.venue === dex);
  const oi = (rs: MarketRow[]): number => rs.reduce((s, r) => s + (r.oiUsd ?? 0), 0);
  const builderOi = oi(perps.filter((r) => r.venue !== MAIN_DEX));
  const deployer = (e: ExchangeListing): string | null => e.deployer?.toLowerCase() ?? null;
  return exchanges.map((e) => {
    const mine = of(e.dex);
    const oiUsd = oi(mine);
    const cap = totalCaps.get(e.dex) ?? null;
    const main = e.dex === MAIN_DEX;
    return {
      dex: e.dex,
      href: exchangePath(e.dex),
      fullName: e.fullName,
      deployer: e.deployer,
      live: e.live,
      delisted: e.delisted,
      oiUsd,
      volume24h: mine.reduce((s, r) => s + r.volume24h, 0),
      builderShare: main || builderOi <= 0 ? null : oiUsd / builderOi,
      totalCapUsd: cap,
      capUse: cap && cap > 0 ? oiUsd / cap : null,
      atOrNearCap: main
        ? mine.filter((r) => r.atCap).length
        : mine.filter((r) => (r.capUse ?? 0) >= NEAR_CAP).length,
      growthModeLive: e.markets.filter((m) => !m.delisted && m.growthMode).length,
      sharesDeployerWith: deployer(e)
        ? exchanges.filter((o) => o.dex !== e.dex && deployer(o) === deployer(e)).map((o) => o.dex)
        : [],
    };
  });
}
