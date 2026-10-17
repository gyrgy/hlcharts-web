/**
 * Perp rows from the live store's labelled contexts, the 1 s price ticks, the
 * builder exchanges' caps (perpDexs) and the main exchange's at-cap list.
 */
import { MAIN_DEX, MARGIN_MODE } from '../hl/constants';
import { PerpDex } from '../hl/types';
import { PerpRow, Tick } from '../live/market-store';
import { perpPath } from './market-paths';
import { ENRICHED_DEFAULTS, MarketRow } from './types';

const ISOLATED_ONLY_MODES = new Set<string>(Object.values(MARGIN_MODE));

export function buildPerpRows(
  perps: readonly PerpRow[],
  tick: (coin: string) => Tick | undefined,
  dexes: ReadonlyMap<string, PerpDex | null>,
  atCap: ReadonlySet<string>
): MarketRow[] {
  const caps = new Map<string, number>();
  for (const d of dexes.values())
    for (const [coin, cap] of d?.assetToStreamingOiCap ?? []) caps.set(coin, Number(cap));

  return perps.map(({ dex, market, ctx }) => {
    const markPx = Number(tick(market.name)?.markPx ?? ctx.markPx);
    const prev = Number(ctx.prevDayPx);
    const oracle = Number(ctx.oraclePx);
    const oiUsd = Number(ctx.openInterest) * markPx;
    const cap = caps.get(market.name);
    let impactSpreadBps: number | null = null;
    if (ctx.impactPxs) {
      const [bid, ask] = ctx.impactPxs.map(Number);
      const mid = (bid + ask) / 2;
      if (bid > 0 && ask > 0) impactSpreadBps = ((ask - bid) / mid) * 10_000;
    }
    return {
      key: market.name,
      kind: 'perp',
      venue: dex,
      name: dex === MAIN_DEX ? market.name : market.name.slice(dex.length + 1),
      href: perpPath(dex, market.name),
      base: (dex === MAIN_DEX ? market.name : market.name.slice(dex.length + 1)).toUpperCase(),
      markPx,
      change24h: prev > 0 ? markPx / prev - 1 : null,
      volume24h: Number(ctx.dayNtlVlm),
      oiCoins: Number(ctx.openInterest),
      oiUsd,
      fundingHourly: Number(ctx.funding),
      premium: ctx.premium === null ? null : Number(ctx.premium),
      basisBps: oracle > 0 ? ((markPx - oracle) / oracle) * 10_000 : null,
      impactSpreadBps,
      maxLeverage: market.maxLeverage,
      capUse: dex !== MAIN_DEX && cap && cap > 0 ? oiUsd / cap : null,
      atCap: dex === MAIN_DEX && atCap.has(market.name),
      delisted: !!market.isDelisted,
      isolatedOnly: !!market.onlyIsolated || ISOLATED_ONLY_MODES.has(market.marginMode ?? ''),
      ...ENRICHED_DEFAULTS,
      alsoOn: [],
    };
  });
}
