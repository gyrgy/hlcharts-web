/**
 * Every market Hyperliquid lists right now, read from its own lists (never a
 * fixed set): perps on every exchange (perpDexs + allPerpMetas, aligned by
 * position, main exchange first) and spot pairs (spotMeta).
 *
 * It is also the dead-market guard: a per-coin subscription is allowed only
 * for a listed, not delisted market. Hyperliquid cuts the WHOLE connection
 * when one of its subscriptions names a market that has gone, which is how the
 * collectors flapped every 15 minutes on settling prediction markets
 * (docs/hlcharts.md §4g); prediction markets (#N) are in neither list, so they
 * are never subscribed.
 */
import { INFO, MAIN_DEX } from '../hl/constants';
import { PerpDex, PerpMarketMeta, PerpMetaWithCollateral, SpotMeta } from '../hl/types';

export interface PerpMarket extends PerpMarketMeta {
  dex: string;
}

export interface UniverseSource {
  request<T>(body: Record<string, unknown>, opts?: { cache?: boolean }): Promise<T>;
}

export class LiveUniverse {
  /** Exchange name ('' = main) -> its perps in Hyperliquid's order, which is the order of its context rows. */
  readonly perps = new Map<string, PerpMarket[]>();
  readonly dexes = new Map<string, PerpDex | null>();
  spot: SpotMeta['universe'] = [];
  /** Token id -> name, from the same spotMeta reply (the lending market names tokens by id). */
  tokenNames = new Map<number, string>();
  private live = new Set<string>();
  loadedAt = 0;

  async load(src: UniverseSource, now: number = Date.now()): Promise<void> {
    const [dexes, metas, spot] = await Promise.all([
      src.request<(PerpDex | null)[]>({ type: INFO.perpDexs }, { cache: true }),
      src.request<PerpMetaWithCollateral[]>({ type: INFO.allPerpMetas }, { cache: true }),
      src.request<SpotMeta>({ type: INFO.spotMeta }, { cache: true }),
    ]);
    if (dexes.length !== metas.length) {
      throw new Error(
        `market lists disagree: ${dexes.length} exchanges, ${metas.length} market lists`
      );
    }
    const perps = new Map<string, PerpMarket[]>();
    const byName = new Map<string, PerpDex | null>();
    dexes.forEach((d, i) => {
      const dex = d ? d.name : MAIN_DEX;
      const rows = metas[i].universe;
      // Builder-exchange markets are named "<dex>:<coin>": a list out of place
      // would label every number with the wrong market, so refuse it.
      const misplaced = rows.find((r) =>
        dex ? !r.name.startsWith(`${dex}:`) : r.name.includes(':')
      );
      if (misplaced) throw new Error(`market list ${i} (${dex || 'main'}) holds ${misplaced.name}`);
      perps.set(
        dex,
        rows.map((r) => ({ ...r, dex }))
      );
      byName.set(dex, d);
    });
    const live = new Set<string>();
    for (const rows of perps.values()) for (const r of rows) if (!r.isDelisted) live.add(r.name);
    for (const p of spot.universe) live.add(p.name);

    this.perps.clear();
    perps.forEach((v, k) => this.perps.set(k, v));
    this.dexes.clear();
    byName.forEach((v, k) => this.dexes.set(k, v));
    this.spot = spot.universe;
    this.tokenNames = new Map(spot.tokens.map((t) => [t.index, t.name]));
    this.live = live;
    this.loadedAt = now;
  }

  get loaded(): boolean {
    return this.loadedAt > 0;
  }

  /** Exchanges with at least one market not delisted (5 of 11 on 2026-10-04). */
  liveDexes(): string[] {
    return [...this.perps.entries()]
      .filter(([, rows]) => rows.some((r) => !r.isDelisted))
      .map(([d]) => d);
  }

  /** The dead-market guard: true only for a listed perp that is not delisted, or a listed spot pair. */
  isSubscribable(coin: string): boolean {
    return this.live.has(coin);
  }
}
