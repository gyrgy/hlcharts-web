/**
 * The tab's one live-data client (docs/hlcharts-website.md §3.2):
 *  - two connections: one for the all-market feeds every page uses, one for
 *    per-coin feeds (books, trades), so a bad per-coin subscription can never
 *    cut the connection carrying every page's numbers;
 *  - per-coin subscriptions only for listed, live markets (dead-market guard),
 *    shared between the components that ask for the same feed;
 *  - every connection's context rows are checked against a REST snapshot of
 *    each exchange before they are labelled; an exchange that fails shows as
 *    unavailable, never with numbers under the wrong market;
 *  - while the all-market connection is down for FALLBACK_AFTER_MS, contexts
 *    are polled over REST every FALLBACK_POLL_MS instead, and the status says
 *    "limited".
 */
import { FEED, INFO, MAIN_DEX } from '../hl/constants';
import { decodeFastAssetCtxs } from '../hl/decode-fast-asset-ctxs';
import { AllDexsAssetCtxs, MetaAndAssetCtxs } from '../hl/types';
import { checkRowOrder } from './check-row-order';
import { ConnectLimiter } from './connect-limiter';
import {
  FALLBACK_AFTER_MS,
  FALLBACK_POLL_MS,
  LIVE_STATUS,
  LiveStatus,
  UNIVERSE_REFRESH_MS,
} from './constants';
import { InfoClient } from './info-client';
import { LiveSocket, SocketFactory, Subscription } from './live-socket';
import { LiveUniverse } from './live-universe';
import { MarketStore } from './market-store';

export type CoinFeed = typeof FEED.l2Book | typeof FEED.trades | typeof FEED.candle;
export interface CoinSubscription extends Subscription {
  type: CoinFeed;
  coin: string;
  nSigFigs?: number;
  /** Candles only: '1m', '15m', '1h', '1d'. */
  interval?: string;
}

export class MarketNotLiveError extends Error {
  constructor(coin: string) {
    super(`${coin} is not a listed, live market: no live feed for it`);
  }
}

/** How often the client checks whether to fall back to polling, and whether data is fresh. */
const WATCH_MS = 5_000;
/** The all-market feed pushes every ~15 s; older than this and the status is not "live". */
const CONTEXTS_FRESH_MS = 45_000;

export class LiveClient {
  readonly store = new MarketStore();
  readonly universe = new LiveUniverse();
  private readonly markets: LiveSocket;
  private readonly coins: LiveSocket;
  private readonly coinListeners = new Map<string, Set<(data: unknown) => void>>();
  /** REST snapshots for the current all-market connection, per exchange. */
  private readonly snapshots = new Map<string, MetaAndAssetCtxs>();
  private lastAllDexs: AllDexsAssetCtxs | null = null;
  private lastContextsAt = 0;
  private marketsDownSince: number | null = null;
  private polling = false;
  private timers: ReturnType<typeof setInterval>[] = [];
  private ready: Promise<void> | null = null;
  /** Recent problems, newest last, for the status line and the feed-test page. */
  readonly problems: string[] = [];

  constructor(
    /** The tab's REST client (shared queue and cache); pages use it for snapshots the sockets do not carry. */
    readonly info: InfoClient,
    url: string,
    limiter: ConnectLimiter,
    create: SocketFactory
  ) {
    this.markets = new LiveSocket(
      url,
      {
        onMessage: (channel, data) => this.onMarketsMessage(channel, data),
        onState: (state) => {
          if (state === 'open') {
            this.marketsDownSince = null;
            this.reverify();
          } else if (this.marketsDownSince === null) this.marketsDownSince = Date.now();
        },
        onRefused: (d) => this.problem(`all-market feed refused: ${d}`),
      },
      limiter,
      create
    );
    this.coins = new LiveSocket(
      url,
      {
        onMessage: (channel, data) => this.onCoinMessage(channel, data),
        onState: () => undefined,
        onRefused: (d) => this.problem(`per-coin feed refused: ${d}`),
      },
      limiter,
      create
    );
    this.markets.subscribe({ type: FEED.allDexsAssetCtxs });
    this.markets.subscribe({ type: FEED.fastAssetCtxs });
  }

  /** Loads the market list, then opens the connections. Safe to call more than once. */
  start(): Promise<void> {
    this.ready ??= (async () => {
      this.marketsDownSince = Date.now();
      await this.universe.load(this.info);
      this.markets.start();
      this.coins.start();
      this.timers.push(setInterval(() => void this.refreshUniverse(), UNIVERSE_REFRESH_MS));
      this.timers.push(setInterval(() => this.watch(), WATCH_MS));
    })();
    return this.ready;
  }

  stop(): void {
    this.polling = false;
    for (const t of this.timers) clearInterval(t);
    this.timers = [];
    this.markets.stop();
    this.coins.stop();
  }

  status(now: number = Date.now()): LiveStatus {
    if (typeof navigator !== 'undefined' && navigator.onLine === false) return LIVE_STATUS.offline;
    if (this.info.limited || this.polling) return LIVE_STATUS.limited;
    if (this.markets.state === 'open' && now - this.lastContextsAt < CONTEXTS_FRESH_MS)
      return LIVE_STATUS.live;
    return LIVE_STATUS.connecting;
  }

  /**
   * A per-coin feed (book or trades). Throws MarketNotLiveError for a market
   * that is not listed and live: the page then shows its REST snapshot only.
   * Returns the function that ends this listener's interest.
   */
  subscribeCoin(sub: CoinSubscription, listener: (data: unknown) => void): () => void {
    // Book messages do not say their nSigFigs: two books of one market on this
    // connection would receive each other's updates. Coarse books come over
    // REST (l2Book with nSigFigs, weight 2) instead.
    if (sub.type === FEED.l2Book && sub.nSigFigs !== undefined) {
      throw new Error('coarse books (nSigFigs) are read over REST, not on the shared connection');
    }
    if (!this.universe.isSubscribable(sub.coin)) throw new MarketNotLiveError(sub.coin);
    const key = JSON.stringify(sub);
    let set = this.coinListeners.get(key);
    if (!set) {
      set = new Set();
      this.coinListeners.set(key, set);
      this.coins.subscribe(sub);
    }
    set.add(listener);
    return () => {
      const s = this.coinListeners.get(key);
      if (!s) return;
      s.delete(listener);
      if (s.size === 0) {
        this.coinListeners.delete(key);
        this.coins.unsubscribe(sub);
      }
    };
  }

  private onMarketsMessage(channel: string, data: unknown): void {
    if (channel === FEED.allDexsAssetCtxs) {
      this.lastAllDexs = data as AllDexsAssetCtxs;
      this.lastContextsAt = Date.now();
      this.applyAllDexs();
    } else if (channel === FEED.fastAssetCtxs) {
      decodeFastAssetCtxs(data)
        .then((ticks) => this.store.applyTicks(ticks, Date.now()))
        .catch((e: unknown) => this.problem(`price ticks: ${String(e)}`));
    }
  }

  private onCoinMessage(channel: string, data: unknown): void {
    // Each feed names its market differently; a candle also names its interval,
    // so two intervals of one market never receive each other's candles.
    const candle = channel === FEED.candle ? (data as { s?: string; i?: string }) : null;
    const coin = candle
      ? candle.s
      : channel === FEED.l2Book
        ? (data as { coin?: string }).coin
        : Array.isArray(data)
          ? (data[0] as { coin?: string } | undefined)?.coin
          : undefined;
    if (!coin) return;
    for (const [key, listeners] of this.coinListeners) {
      const sub = JSON.parse(key) as CoinSubscription;
      if (sub.type !== channel || sub.coin !== coin) continue;
      if (candle && sub.interval !== candle.i) continue;
      for (const l of listeners) l(data);
    }
  }

  /** Label the latest all-market message, exchange by exchange, once each is verified. */
  private applyAllDexs(): void {
    const msg = this.lastAllDexs;
    if (!msg) return;
    const live = new Set(this.universe.liveDexes());
    for (const [dex, rows] of msg.ctxs) {
      if (!live.has(dex)) continue;
      const state = this.store.dexState.get(dex);
      const snap = this.snapshots.get(dex);
      if (state === 'verified' && snap && rows.length !== snap[1].length) {
        // A listing since the snapshot: check this exchange again before labelling more rows.
        this.snapshotDex(dex);
      } else if (state === 'verified' && snap) {
        this.store.applyContexts(dex, snap[0].universe, rows, Date.now());
      } else if (state === 'pending' && snap) {
        const r = checkRowOrder(rows, snap[1]);
        if (r.ok) {
          this.store.dexState.set(dex, 'verified');
          this.store.applyContexts(dex, snap[0].universe, rows, Date.now());
        } else {
          this.store.dexState.set(dex, 'unavailable');
          this.store.dropDex(dex);
          this.problem(
            `${dex || 'main exchange'}: live rows do not match the market list (${r.matched} of ${r.total}, snapshot ${snap[1].length}); not shown until the next check`
          );
        }
      }
    }
  }

  /** On every new all-market connection: take fresh snapshots and check each exchange's row order again. */
  private reverify(): void {
    this.snapshots.clear();
    for (const dex of this.universe.liveDexes()) this.snapshotDex(dex);
  }

  private snapshotDex(dex: string): void {
    this.store.dexState.set(dex, 'pending');
    this.snapshots.delete(dex);
    this.info
      .request<MetaAndAssetCtxs>(
        dex === MAIN_DEX ? { type: INFO.metaAndAssetCtxs } : { type: INFO.metaAndAssetCtxs, dex }
      )
      .then((snap) => {
        this.snapshots.set(dex, snap);
        this.applyAllDexs();
      })
      .catch((e: unknown) => this.problem(`${dex || 'main exchange'} snapshot: ${String(e)}`));
  }

  private async refreshUniverse(): Promise<void> {
    try {
      await this.universe.load(this.info);
      // Listings and delistings change row counts: check unavailable exchanges again.
      if ([...this.store.dexState.values()].includes('unavailable')) this.reverify();
    } catch (e) {
      this.problem(`market list: ${String(e)}`);
    }
  }

  private watch(): void {
    const down =
      this.marketsDownSince !== null && Date.now() - this.marketsDownSince > FALLBACK_AFTER_MS;
    if (down && !this.polling) {
      this.polling = true;
      void this.poll();
    } else if (!down) {
      this.polling = false;
    }
  }

  /** REST fallback: each reply names its own rows, so no order check is needed. */
  private async poll(): Promise<void> {
    while (this.polling) {
      for (const dex of this.universe.liveDexes()) {
        try {
          const [meta, ctxs] = await this.info.request<MetaAndAssetCtxs>(
            dex === MAIN_DEX
              ? { type: INFO.metaAndAssetCtxs }
              : { type: INFO.metaAndAssetCtxs, dex }
          );
          this.store.dexState.set(dex, 'verified');
          this.store.applyContexts(dex, meta.universe, ctxs, Date.now());
        } catch (e) {
          this.problem(`${dex || 'main exchange'} polling: ${String(e)}`);
        }
      }
      if (!this.polling) break;
      await new Promise((r) => setTimeout(r, FALLBACK_POLL_MS));
    }
    // Back on the websocket: its 'open' already started a fresh row check.
  }

  private problem(text: string): void {
    this.problems.push(`${new Date().toISOString().slice(11, 19)} ${text}`);
    if (this.problems.length > 20) this.problems.shift();
  }
}
