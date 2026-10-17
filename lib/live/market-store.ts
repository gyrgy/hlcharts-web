/**
 * The latest numbers of every perp, labelled, plus the 1-second price ticks of
 * every market. Pages read it and subscribe for changes; listeners hear at
 * most once per NOTIFY_INTERVAL_MS (rendering more often is wasted work).
 */
import { FastAssetCtxs, PerpAssetCtx, PerpMarketMeta } from '../hl/types';
import { NOTIFY_INTERVAL_MS } from './constants';

export interface PerpRow {
  dex: string;
  market: PerpMarketMeta;
  ctx: PerpAssetCtx;
  /** When the context (funding, OI, ...) arrived; ticks are newer. */
  ctxAt: number;
}

export interface Tick {
  markPx?: string;
  midPx?: string;
  at: number;
}

export type DexState = 'pending' | 'verified' | 'unavailable';

export class MarketStore {
  private readonly rows = new Map<string, PerpRow>();
  private readonly ticks = new Map<string, Tick>();
  readonly dexState = new Map<string, DexState>();
  private readonly listeners = new Set<() => void>();
  private timer: ReturnType<typeof setTimeout> | null = null;
  private lastNotify = 0;

  /** Rows labelled by position from `markets`, which the caller has checked are in the same order. */
  applyContexts(
    dex: string,
    markets: readonly PerpMarketMeta[],
    ctxs: readonly PerpAssetCtx[],
    at: number
  ): void {
    ctxs.forEach((ctx, i) => {
      const market = markets[i];
      if (market) this.rows.set(market.name, { dex, market, ctx, ctxAt: at });
    });
    this.changed();
  }

  applyTicks(ticks: FastAssetCtxs, at: number): void {
    for (const [coin, t] of Object.entries(ticks)) {
      const prev = this.ticks.get(coin);
      this.ticks.set(coin, { markPx: t.markPx ?? prev?.markPx, midPx: t.midPx ?? prev?.midPx, at });
    }
    this.changed();
  }

  /** Perps of exchanges whose rows were verified; delisted ones included (pages filter). */
  perps(): PerpRow[] {
    return [...this.rows.values()].filter((r) => this.dexState.get(r.dex) === 'verified');
  }

  perp(coin: string): PerpRow | undefined {
    const r = this.rows.get(coin);
    return r && this.dexState.get(r.dex) === 'verified' ? r : undefined;
  }

  tick(coin: string): Tick | undefined {
    return this.ticks.get(coin);
  }

  /** Forget an exchange's rows (its order could not be verified). */
  dropDex(dex: string): void {
    for (const [coin, r] of this.rows) if (r.dex === dex) this.rows.delete(coin);
    this.changed();
  }

  subscribe(listener: () => void): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  private changed(): void {
    if (this.timer) return;
    const wait = Math.max(0, this.lastNotify + NOTIFY_INTERVAL_MS - Date.now());
    this.timer = setTimeout(() => {
      this.timer = null;
      this.lastNotify = Date.now();
      for (const l of this.listeners) l();
    }, wait);
  }
}
