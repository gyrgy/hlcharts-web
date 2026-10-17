/**
 * Spot rows from spotMetaAndAssetCtxs and the 1 s price ticks. Contexts are
 * matched to pairs by name (they are not in pair order, and include
 * prediction markets and former pairs), and tokens by id (not position).
 *
 * No market cap or fully diluted value: Hyperliquid's supply fields are not
 * circulating supply in the usual sense (2026-10-04: UBTC reports 21M, the
 * bitcoin maximum, so $1,788B; stablecoins $100-184B; KHYPE $17,036B), and
 * nothing in the API tells the sound values from the rest.
 */
import { SpotMetaAndAssetCtxs } from '../hl/types';
import { Tick } from '../live/market-store';
import { spotPath } from './market-paths';
import { ENRICHED_DEFAULTS, MarketRow } from './types';

export const SPOT_VENUE = 'spot';

export function buildSpotRows(
  snapshot: SpotMetaAndAssetCtxs,
  tick: (coin: string) => Tick | undefined
): MarketRow[] {
  const [meta, ctxs] = snapshot;
  const tokens = new Map(meta.tokens.map((t) => [t.index, t.name]));
  const byCoin = new Map(ctxs.map((c) => [c.coin, c]));
  const pairName = (p: (typeof meta.universe)[number]): string =>
    `${tokens.get(p.tokens[0])}/${tokens.get(p.tokens[1])}`;
  const counts = new Map<string, number>();
  for (const p of meta.universe) counts.set(pairName(p), (counts.get(pairName(p)) ?? 0) + 1);
  const rows: MarketRow[] = [];
  for (const pair of meta.universe) {
    const ctx = byCoin.get(pair.name);
    const base = tokens.get(pair.tokens[0]);
    const quote = tokens.get(pair.tokens[1]);
    if (!ctx || !base || !quote) continue;
    const markPx = Number(tick(pair.name)?.markPx ?? ctx.markPx);
    const prev = Number(ctx.prevDayPx);
    rows.push({
      key: pair.name,
      kind: 'spot',
      venue: SPOT_VENUE,
      name: `${base}/${quote}`,
      href: spotPath(base, quote, pair.index, (counts.get(pairName(pair)) ?? 0) > 1),
      base: base.toUpperCase(),
      quoteToken: pair.tokens[1],
      markPx,
      change24h: prev > 0 ? markPx / prev - 1 : null,
      volume24h: Number(ctx.dayNtlVlm),
      oiCoins: null,
      oiUsd: null,
      fundingHourly: null,
      premium: null,
      basisBps: null,
      impactSpreadBps: null,
      maxLeverage: null,
      capUse: null,
      atCap: false,
      delisted: false,
      isolatedOnly: false,
      ...ENRICHED_DEFAULTS,
      alsoOn: [],
    });
  }
  return rows;
}
