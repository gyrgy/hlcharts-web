/**
 * The live-data client's rules. Each test is a failure that would look like
 * working software: requests over Hyperliquid's per-IP limit, a reconnect
 * storm, a dead market cutting the shared connection, numbers labelled with
 * the wrong market.
 */
import zlib from 'zlib';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { checkRowOrder } from '../check-row-order';
import { ConnectLimiter } from '../connect-limiter';
import { InfoClient, FetchLike } from '../info-client';
import { infoWeight } from '../info-weight';
import { LiveClient, MarketNotLiveError } from '../live-client';
import { LiveSocket, SocketLike } from '../live-socket';
import { LiveUniverse, UniverseSource } from '../live-universe';
import { SnapshotCache, StorageLike } from '../snapshot-cache';
import { Clock, WeightQueue } from '../weight-queue';
import { waitNote } from '../wait-note';

/** Simulated time: sleep advances the clock instantly. */
function fakeClock(): Clock & { t: number } {
  const c = {
    t: 0,
    now: () => c.t,
    sleep: async (ms: number) => {
      c.t += ms;
    },
  };
  return c;
}

/** A websocket stand-in that records what was sent and lets the test open, close and push messages. */
class FakeSocket implements SocketLike {
  static all: FakeSocket[] = [];
  sent: unknown[] = [];
  closed = false;
  onopen: (() => void) | null = null;
  onmessage: ((ev: { data: unknown }) => void) | null = null;
  onclose: ((ev: { code: number }) => void) | null = null;
  onerror: (() => void) | null = null;
  constructor(readonly url: string) {
    FakeSocket.all.push(this);
  }
  send(data: string): void {
    this.sent.push(JSON.parse(data));
  }
  close(): void {
    if (this.closed) return;
    this.closed = true;
    this.onclose?.({ code: 1006 });
  }
  open(): void {
    this.onopen?.();
  }
  push(channel: string, data: unknown): void {
    this.onmessage?.({ data: JSON.stringify({ channel, data }) });
  }
  subscribes(): unknown[] {
    return this.sent.filter((m) => (m as { method: string }).method === 'subscribe');
  }
}
const newSocket = (url: string): SocketLike => new FakeSocket(url);

describe('weight queue: one tab never spends more than its share of the per-IP limit', () => {
  it('runs requests at once within the budget and makes the next one wait for the window', async () => {
    const clock = fakeClock();
    const q = new WeightQueue(600, 60_000, clock);
    const starts: number[] = [];
    await Promise.all(
      Array.from({ length: 31 }, () => q.run(20, async () => void starts.push(clock.t)))
    );
    expect(starts.slice(0, 30).every((t) => t === 0)).toBe(true);
    expect(starts[30]).toBeGreaterThanOrEqual(60_000);
  });

  it('keeps the order requests were made in, and a pause holds all of them', async () => {
    const clock = fakeClock();
    const q = new WeightQueue(600, 60_000, clock);
    const seen: string[] = [];
    q.pause(10_000);
    expect(q.paused).toBe(true);
    await Promise.all(
      ['a', 'b', 'c'].map((x) => q.run(20, async () => void seen.push(`${x}@${clock.t}`)))
    );
    expect(seen).toEqual(['a@10000', 'b@10000', 'c@10000']);
  });

  it('says when a request held back by the budget will go, so a page can count down', async () => {
    let release = (): void => undefined;
    const clock = {
      t: 0,
      now: () => clock.t,
      sleep: (ms: number) =>
        new Promise<void>((resolve) => {
          release = () => {
            clock.t += ms;
            resolve();
          };
        }),
    };
    const q = new WeightQueue(40, 60_000, clock);
    await q.run(40, async () => undefined);
    expect(q.resumesAt).toBe(0);
    const next = q.run(20, async () => 'ran');
    await new Promise((r) => setTimeout(r, 0));
    expect(q.resumesAt).toBe(60_000);
    release();
    expect(await next).toBe('ran');
    expect(q.resumesAt).toBe(0);
  });

  it('turns the wait into a countdown sentence, and nothing when no request waits', () => {
    expect(waitNote(0, 5_000)).toBe('');
    expect(waitNote(4_000, 5_000)).toBe('');
    expect(waitNote(39_100, 0)).toBe(
      " Waiting 40 s for Hyperliquid's per-minute request limit, then it continues."
    );
  });

  it('counts weight learned from the reply', async () => {
    const q = new WeightQueue(600, 60_000, fakeClock());
    await q.run(20, async () => undefined);
    q.charge(25);
    expect(q.used()).toBe(45);
  });
});

describe('request weights', () => {
  it("charges Hyperliquid's weights: cheap types, default, and per items returned", () => {
    expect(infoWeight({ type: 'l2Book' }).upfront).toBe(2);
    expect(infoWeight({ type: 'metaAndAssetCtxs' }).upfront).toBe(20);
    expect(infoWeight({ type: 'candleSnapshot' }, new Array(5000)).extra).toBe(83);
    expect(infoWeight({ type: 'fundingHistory' }, new Array(500)).extra).toBe(25);
    expect(infoWeight({ type: 'meta' }, new Array(500)).extra).toBe(0);
  });
});

describe('info client', () => {
  const ok = (json: unknown) => ({ ok: true, status: 200, json: async () => json });
  const refused = { ok: false, status: 429, json: async () => ({}) };
  const cache = () => new SnapshotCache(60_000, null);

  it('on a 429 pauses every request, retries after the pause, and says it is limited meanwhile', async () => {
    const clock = fakeClock();
    const replies = [refused, ok({ x: 1 })];
    const calls: number[] = [];
    let limitedDuring = false;
    const fetchFn: FetchLike = async () => {
      calls.push(clock.t);
      return replies.shift()!;
    };
    const info = new InfoClient(new WeightQueue(600, 60_000, clock), cache(), async (u, i) => {
      if (calls.length === 1) limitedDuring = info.limited;
      return fetchFn(u, i);
    });
    expect(await info.request({ type: 'meta' })).toEqual({ x: 1 });
    expect(calls[1] - calls[0]).toBeGreaterThanOrEqual(10_000);
    expect(limitedDuring).toBe(true);
    expect(info.limited).toBe(false);
  });

  it('gives up after repeated refusals instead of retrying forever', async () => {
    const info = new InfoClient(
      new WeightQueue(600, 60_000, fakeClock()),
      cache(),
      async () => refused
    );
    await expect(info.request({ type: 'meta' })).rejects.toThrow(/refused \(429\) 4 times/);
  });

  it('reuses a cached snapshot instead of asking again', async () => {
    let n = 0;
    const info = new InfoClient(new WeightQueue(600, 60_000, fakeClock()), cache(), async () =>
      ok({ n: ++n })
    );
    await info.request({ type: 'spotMeta' }, { cache: true });
    expect(await info.request({ type: 'spotMeta' }, { cache: true })).toEqual({ n: 1 });
    expect(await info.request({ type: 'spotMeta' })).toEqual({ n: 2 });
  });
});

describe('snapshot cache', () => {
  it('expires after its time to live and survives storage that throws', () => {
    let t = 0;
    const broken: StorageLike = {
      getItem: () => {
        throw new Error('blocked');
      },
      setItem: () => {
        throw new Error('blocked');
      },
    };
    const c = new SnapshotCache(60_000, broken, () => t);
    c.set('k', 1);
    expect(c.get('k')).toBe(1);
    t = 60_001;
    expect(c.get('k')).toBeUndefined();
  });
});

describe('row order check', () => {
  const rows = (...px: number[]) => px.map((p) => ({ markPx: String(p) }));
  it("accepts rows in the snapshot's order, rejects swapped rows and a changed length", () => {
    expect(checkRowOrder(rows(100, 2, 0.5), rows(100.1, 2, 0.5)).ok).toBe(true);
    expect(checkRowOrder(rows(2, 100, 0.5), rows(100, 2, 0.5)).ok).toBe(false);
    expect(checkRowOrder(rows(100, 2), rows(100, 2, 0.5)).ok).toBe(false);
  });
});

// Real shapes (captured 2026-10-04), cut down.
const PERP_DEXS = [
  null,
  {
    name: 'xyz',
    fullName: 'XYZ',
    deployer: '0x1',
    oracleUpdater: null,
    feeRecipient: null,
    assetToStreamingOiCap: [],
    assetToFundingMultiplier: [],
    assetToFundingInterestRate: [],
  },
];
const ALL_PERP_METAS = [
  {
    universe: [
      { name: 'BTC', szDecimals: 5, maxLeverage: 40 },
      { name: 'OLD', szDecimals: 0, maxLeverage: 3, isDelisted: true },
      { name: 'ETH', szDecimals: 4, maxLeverage: 25 },
    ],
    collateralToken: 0,
  },
  { universe: [{ name: 'xyz:TSLA', szDecimals: 3, maxLeverage: 10 }], collateralToken: 0 },
];
const SPOT_META = {
  universe: [
    { tokens: [1, 0], name: 'PURR/USDC', index: 0, isCanonical: true },
    { tokens: [2, 0], name: '@1', index: 1, isCanonical: false },
  ],
  tokens: [
    { name: 'USDC', szDecimals: 8, weiDecimals: 8, index: 0, isCanonical: true },
    { name: 'HYPE', szDecimals: 2, weiDecimals: 8, index: 150, isCanonical: true },
  ],
};
const ctx = (markPx: string) => ({
  funding: '0.0000125',
  openInterest: '1',
  prevDayPx: markPx,
  dayNtlVlm: '1',
  premium: '0',
  oraclePx: markPx,
  markPx,
  midPx: markPx,
  impactPxs: [markPx, markPx],
  dayBaseVlm: '1',
});
const MAIN_CTXS = [ctx('85000'), ctx('1.0'), ctx('3000')];
const XYZ_CTXS = [ctx('250')];

function fakeSource(overrides: Record<string, unknown> = {}): UniverseSource & { calls: string[] } {
  const calls: string[] = [];
  return {
    calls,
    request: async <T>(body: Record<string, unknown>): Promise<T> => {
      calls.push(`${String(body.type)}${body.dex ? `:${String(body.dex)}` : ''}`);
      const replies: Record<string, unknown> = {
        perpDexs: PERP_DEXS,
        allPerpMetas: ALL_PERP_METAS,
        spotMeta: SPOT_META,
        metaAndAssetCtxs: [{ universe: ALL_PERP_METAS[0].universe }, MAIN_CTXS],
        'metaAndAssetCtxs:xyz': [{ universe: ALL_PERP_METAS[1].universe }, XYZ_CTXS],
        ...overrides,
      };
      const key = `${String(body.type)}${body.dex ? `:${String(body.dex)}` : ''}`;
      if (!(key in replies)) throw new Error(`no fake reply for ${key}`);
      return replies[key] as T;
    },
  };
}

describe('market list and the dead-market guard', () => {
  it('allows per-coin feeds only for listed, live markets', async () => {
    const u = new LiveUniverse();
    await u.load(fakeSource());
    expect(u.isSubscribable('BTC')).toBe(true);
    expect(u.isSubscribable('xyz:TSLA')).toBe(true);
    expect(u.isSubscribable('@1')).toBe(true);
    expect(u.isSubscribable('OLD')).toBe(false); // delisted
    expect(u.isSubscribable('#70411')).toBe(false); // a prediction market: in neither list
    expect(u.isSubscribable('DOGE')).toBe(false); // not listed
    expect(u.liveDexes()).toEqual(['', 'xyz']);
  });

  it('names tokens by their id, not their place in the list', async () => {
    const u = new LiveUniverse();
    await u.load(fakeSource());
    expect(u.tokenNames.get(150)).toBe('HYPE');
    expect(u.tokenNames.get(1)).toBeUndefined();
  });

  it('refuses market lists that do not line up with the exchanges', async () => {
    const u = new LiveUniverse();
    await expect(
      u.load(fakeSource({ allPerpMetas: [ALL_PERP_METAS[1], ALL_PERP_METAS[0]] }))
    ).rejects.toThrow(/holds/);
    await expect(u.load(fakeSource({ allPerpMetas: [ALL_PERP_METAS[0]] }))).rejects.toThrow(
      /disagree/
    );
  });
});

describe("live socket: the collectors' reconnect lessons", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    FakeSocket.all = [];
  });
  afterEach(() => vi.useRealTimers());

  const make = (events: Partial<{ refused: string[]; messages: [string, unknown][] }> = {}) =>
    new LiveSocket(
      'wss://x',
      {
        onMessage: (c, d) => events.messages?.push([c, d]),
        onState: () => undefined,
        onRefused: (d) => events.refused?.push(d),
      },
      new ConnectLimiter(100),
      newSocket
    );

  it('re-subscribes after every reconnect, one subscription per 100 ms, never in a burst', () => {
    const s = make();
    s.subscribe({ type: 'a' });
    s.subscribe({ type: 'b' });
    s.subscribe({ type: 'c' });
    s.start();
    FakeSocket.all[0].open();
    expect(FakeSocket.all[0].subscribes()).toHaveLength(1);
    vi.advanceTimersByTime(100);
    expect(FakeSocket.all[0].subscribes()).toHaveLength(2);
    vi.advanceTimersByTime(100);
    expect(FakeSocket.all[0].subscribes()).toHaveLength(3);
    FakeSocket.all[0].close();
    vi.advanceTimersByTime(1_300);
    FakeSocket.all[1].open();
    vi.advanceTimersByTime(300);
    expect(FakeSocket.all[1].subscribes()).toHaveLength(3);
  });

  it('waits longer after each drop, and resets only after a connection stayed up 60 s', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.5); // no jitter
    const s = make();
    s.start();
    const reconnectAfter = (): number => {
      const before = FakeSocket.all.length;
      FakeSocket.all[before - 1].close();
      let waited = 0;
      while (FakeSocket.all.length === before) {
        vi.advanceTimersByTime(100);
        waited += 100;
      }
      return waited;
    };
    FakeSocket.all[0].open();
    expect(reconnectAfter()).toBe(1_000);
    FakeSocket.all[1].open();
    vi.advanceTimersByTime(59_000); // up, but not long enough
    expect(reconnectAfter()).toBe(2_000);
    FakeSocket.all[2].open();
    expect(reconnectAfter()).toBe(4_000);
    FakeSocket.all[3].open();
    vi.advanceTimersByTime(61_000); // stable
    expect(reconnectAfter()).toBe(1_000);
  });

  it('pings every 30 s and rebuilds a connection silent for 90 s', () => {
    const s = make();
    s.start();
    FakeSocket.all[0].open();
    vi.advanceTimersByTime(30_000);
    expect(FakeSocket.all[0].sent).toContainEqual({ method: 'ping' });
    // Silence is checked at each ping: still up at 90 s, rebuilt at the 120 s check.
    vi.advanceTimersByTime(60_000);
    expect(FakeSocket.all[0].closed).toBe(false);
    vi.advanceTimersByTime(30_000);
    expect(FakeSocket.all[0].closed).toBe(true);
    vi.advanceTimersByTime(2_000);
    expect(FakeSocket.all).toHaveLength(2);
  });

  it('reports Hyperliquid refusing a subscription and passes data on', () => {
    const refused: string[] = [];
    const messages: [string, unknown][] = [];
    const s = make({ refused, messages });
    s.start();
    FakeSocket.all[0].open();
    FakeSocket.all[0].push('error', 'Invalid subscription');
    FakeSocket.all[0].push('l2Book', { coin: 'BTC' });
    expect(refused).toEqual(['"Invalid subscription"']);
    expect(messages).toEqual([['l2Book', { coin: 'BTC' }]]);
  });

  it('opens no more connections a minute than its cap', () => {
    const limiter = new ConnectLimiter(2);
    expect([limiter.take(), limiter.take()]).toEqual([0, 0]);
    expect(limiter.take()).toBeGreaterThan(0);
  });
});

describe('live client', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    FakeSocket.all = [];
  });
  afterEach(() => vi.useRealTimers());

  async function started(overrides: Record<string, unknown> = {}) {
    const src = fakeSource(overrides);
    const client = new LiveClient(
      src as unknown as InfoClient,
      'wss://x',
      new ConnectLimiter(100),
      newSocket
    );
    await client.start();
    const [markets, coins] = FakeSocket.all;
    markets.open();
    coins.open();
    await vi.advanceTimersByTimeAsync(500);
    return { client, markets, coins, src };
  }

  it('labels the live rows only after they match a fresh snapshot of each exchange', async () => {
    const { client, markets, src } = await started();
    expect(src.calls).toEqual(expect.arrayContaining(['metaAndAssetCtxs', 'metaAndAssetCtxs:xyz']));
    markets.push('allDexsAssetCtxs', {
      ctxs: [
        ['', MAIN_CTXS],
        ['xyz', XYZ_CTXS],
        ['flx', [ctx('1')]],
      ],
    });
    expect(client.store.perp('BTC')?.ctx.markPx).toBe('85000');
    expect(client.store.perp('xyz:TSLA')?.ctx.markPx).toBe('250');
    expect(client.store.dexState.get('')).toBe('verified');
  });

  it('shows an exchange as unavailable, not mislabelled, when its rows come in another order', async () => {
    const { client, markets } = await started();
    markets.push('allDexsAssetCtxs', {
      ctxs: [
        ['', [MAIN_CTXS[2], MAIN_CTXS[1], MAIN_CTXS[0]]],
        ['xyz', XYZ_CTXS],
      ],
    });
    expect(client.store.dexState.get('')).toBe('unavailable');
    expect(client.store.perp('BTC')).toBeUndefined();
    expect(client.store.perp('xyz:TSLA')?.ctx.markPx).toBe('250');
    expect(client.problems.join()).toMatch(/do not match the market list/);
  });

  it('decodes the compressed price ticks into the store', async () => {
    const { client, markets } = await started();
    const data = zlib
      .deflateRawSync(Buffer.from(JSON.stringify({ BTC: { markPx: '85001' } })))
      .toString('base64');
    markets.push('fastAssetCtxs', data);
    await vi.waitFor(() => expect(client.store.tick('BTC')?.markPx).toBe('85001'));
  });

  it('never subscribes a dead market, and per-coin feeds stay off the all-market connection', async () => {
    const { client, markets, coins } = await started();
    expect(() => client.subscribeCoin({ type: 'l2Book', coin: 'OLD' }, () => undefined)).toThrow(
      MarketNotLiveError
    );
    expect(() => client.subscribeCoin({ type: 'l2Book', coin: '#70411' }, () => undefined)).toThrow(
      MarketNotLiveError
    );
    client.subscribeCoin({ type: 'l2Book', coin: 'BTC' }, () => undefined);
    await vi.advanceTimersByTimeAsync(200);
    expect(coins.subscribes()).toEqual([
      { method: 'subscribe', subscription: { type: 'l2Book', coin: 'BTC' } },
    ]);
    expect(JSON.stringify(markets.sent)).not.toMatch(/l2Book/);
  });

  it('refuses a coarse book on the shared connection: book messages do not say their granularity', async () => {
    const { client, coins } = await started();
    expect(() =>
      client.subscribeCoin({ type: 'l2Book', coin: 'BTC', nSigFigs: 3 }, () => undefined)
    ).toThrow(/REST/);
    await vi.advanceTimersByTimeAsync(200);
    expect(coins.subscribes()).toEqual([]);
  });

  it('gives each candle chart only its own interval (a candle names its market in `s`, its interval in `i`)', async () => {
    const { client, coins } = await started();
    const got: string[] = [];
    client.subscribeCoin({ type: 'candle', coin: 'BTC', interval: '1m' }, () => got.push('1m'));
    client.subscribeCoin({ type: 'candle', coin: 'BTC', interval: '15m' }, () => got.push('15m'));
    await vi.advanceTimersByTimeAsync(300);
    coins.push('candle', { t: 0, s: 'BTC', i: '1m', o: '1', c: '1', h: '1', l: '1' });
    coins.push('candle', { t: 0, s: 'ETH', i: '15m', o: '1', c: '1', h: '1', l: '1' });
    expect(got).toEqual(['1m']);
  });

  it('shares one subscription between listeners and drops it when the last one leaves', async () => {
    const { client, coins } = await started();
    const got: unknown[] = [];
    const sub = { type: 'l2Book' as const, coin: 'ETH' };
    const off1 = client.subscribeCoin(sub, (d) => got.push(['one', d]));
    const off2 = client.subscribeCoin(sub, (d) => got.push(['two', d]));
    await vi.advanceTimersByTimeAsync(200);
    coins.push('l2Book', { coin: 'ETH' });
    coins.push('l2Book', { coin: 'BTC' });
    expect(got).toEqual([
      ['one', { coin: 'ETH' }],
      ['two', { coin: 'ETH' }],
    ]);
    off1();
    off2();
    await vi.advanceTimersByTimeAsync(200);
    expect(coins.subscribes()).toHaveLength(1);
    expect(
      coins.sent.filter((m) => (m as { method: string }).method === 'unsubscribe')
    ).toHaveLength(1);
  });
});
