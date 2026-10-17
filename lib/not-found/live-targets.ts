/**
 * Every market Hyperliquid lists right now, by the address its page has or
 * would have (the same functions as the build), so the 404 page can show a
 * market listed since the last build. A spot list naming an unknown token
 * leaves spot out rather than guess a name.
 */
import { PerpPage } from '../build/build-markets';
import { PerpDex, SpotMeta } from '../hl/types';
import { PerpMarket } from '../live/live-universe';
import { perpPath } from '../markets/market-paths';
import { SpotPage, spotPages } from '../markets/spot-pages';

export type LiveTarget = { kind: 'perp'; page: PerpPage } | { kind: 'spot'; page: SpotPage };

export interface UniverseLike {
  perps: ReadonlyMap<string, readonly PerpMarket[]>;
  dexes: ReadonlyMap<string, PerpDex | null>;
  spot: SpotMeta['universe'];
  tokenNames: ReadonlyMap<number, string>;
}

export function liveTargets(u: UniverseLike): Map<string, LiveTarget> {
  const out = new Map<string, LiveTarget>();
  for (const [dex, markets] of u.perps) {
    for (const market of markets) {
      const path = perpPath(dex, market.name);
      out.set(path, { kind: 'perp', page: { path, market, dex: u.dexes.get(dex) ?? null } });
    }
  }
  try {
    for (const page of spotPages(u.spot, u.tokenNames, new Map())) {
      out.set(page.path, { kind: 'spot', page });
    }
  } catch {
    // An unknown token: no spot targets this time.
  }
  return out;
}
