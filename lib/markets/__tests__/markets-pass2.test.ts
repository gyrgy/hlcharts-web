/**
 * Pass 2 of the markets table: predicted funding from Binance and Bybit, the
 * "also on" badge, and the opt-in open-interest memory. Each test is a way the
 * page would mislead: an 8-hour rate shown as hourly, another asset called the
 * same one, something stored before the visitor asked.
 */
import { describe, expect, it } from 'vitest';
import { PredictedFundings } from '../../hl/types';
import { oiMemory } from '../oi-memory';
import { oiSnapshot } from '../oi-snapshot';
import { ENRICHED_DEFAULTS, MarketRow } from '../types';
import { withOiChange } from '../with-oi-change';
import { withPredictedFunding } from '../with-predicted-funding';
import { isNameOnly, isSibling } from '../sibling-rules';
import { withSiblings } from '../with-siblings';

const row = (o: Partial<MarketRow> & Pick<MarketRow, 'key'>): MarketRow => ({
  kind: 'perp',
  venue: '',
  name: o.key,
  href: '/',
  base: o.key.toUpperCase(),
  markPx: 100,
  change24h: 0,
  volume24h: 1000,
  oiCoins: 10,
  oiUsd: 1000,
  fundingHourly: 0.0000125,
  premium: 0,
  basisBps: 0,
  impactSpreadBps: 1,
  maxLeverage: 10,
  capUse: null,
  atCap: false,
  delisted: false,
  isolatedOnly: false,
  ...ENRICHED_DEFAULTS,
  alsoOn: [],
  ...o,
});

describe('predicted funding', () => {
  // Shapes as served on 2026-10-04.
  const predicted: PredictedFundings = [
    [
      'BTC',
      [
        ['BinPerp', { fundingRate: '0.00008', nextFundingTime: 0, fundingIntervalHours: 8 }],
        ['HlPerp', { fundingRate: '0.0000125', nextFundingTime: 0, fundingIntervalHours: 1 }],
        ['BybitPerp', { fundingRate: '0.00004', nextFundingTime: 0, fundingIntervalHours: 4 }],
      ],
    ],
    [
      'AI',
      [
        ['BinPerp', { fundingRate: '0.0', nextFundingTime: 0 }],
        ['BybitPerp', null],
      ],
    ],
  ];

  it('divides each venue’s own interval out, so the rates sit on Hyperliquid’s hourly basis', () => {
    const [btc] = withPredictedFunding([row({ key: 'BTC' })], predicted);
    expect(btc.binanceHourly).toBeCloseTo(0.00001, 10);
    expect(btc.bybitHourly).toBeCloseTo(0.00001, 10);
    expect(btc.cexGapHourly).toBeCloseTo(0.0000125 - 0.00001, 10);
  });

  it('leaves a rate without its interval, or a venue not listing the coin, missing', () => {
    const [ai] = withPredictedFunding([row({ key: 'AI' })], predicted);
    expect(ai.binanceHourly).toBeNull();
    expect(ai.bybitHourly).toBeNull();
    expect(ai.cexGapHourly).toBeNull();
  });

  it('touches main-exchange perps only', () => {
    const rows = withPredictedFunding(
      [
        row({ key: 'xyz:BTC', venue: 'xyz', base: 'BTC' }),
        row({ key: 'BTC', kind: 'spot', venue: 'spot' }),
      ],
      predicted
    );
    expect(rows.map((r) => r.binanceHourly)).toEqual([null, null]);
  });
});

describe('also on', () => {
  it('matches the same asset by name and price, never by name alone', () => {
    const rows = withSiblings([
      row({ key: 'STX', markPx: 0.379 }),
      row({ key: 'para:STX', venue: 'para', base: 'STX', markPx: 840 }),
      row({ key: 'xyz:SNDK', venue: 'xyz', base: 'SNDK', markPx: 1718.1 }),
      row({ key: 'io:SNDK', venue: 'io', base: 'SNDK', markPx: 1719.7 }),
    ]);
    expect(rows.map((r) => [r.key, r.alsoOn])).toEqual([
      ['STX', []],
      ['para:STX', []],
      ['xyz:SNDK', ['io']],
      ['io:SNDK', ['xyz']],
    ]);
  });

  it('links perps and spot, names each venue once, and leaves stale markets out', () => {
    const rows = withSiblings([
      row({ key: 'HYPE', markPx: 90.25 }),
      row({ key: '@107', kind: 'spot', venue: 'spot', base: 'HYPE', markPx: 90.21 }),
      row({ key: '@200', kind: 'spot', venue: 'spot', base: 'HYPE', markPx: 90.26 }),
      row({ key: '@300', kind: 'spot', venue: 'spot', base: 'HYPE', markPx: 90.2, volume24h: 0 }),
      row({ key: 'xyz:HYPE', venue: 'xyz', base: 'HYPE', markPx: 90.3, delisted: true }),
    ]);
    const by = new Map(rows.map((r) => [r.key, r.alsoOn]));
    expect(by.get('HYPE')).toEqual(['spot']);
    expect(by.get('@107')).toEqual(['main']);
    expect(by.get('@300')).toEqual([]);
    expect(by.get('xyz:HYPE')).toEqual([]);
  });
});

describe('same name, different asset', () => {
  it('calls main STX and para:STX different assets, and SNDK on xyz and io the same one', () => {
    const stx = row({ key: 'STX', markPx: 0.379 });
    const paraStx = row({ key: 'para:STX', venue: 'para', base: 'STX', markPx: 840 });
    const xyz = row({ key: 'xyz:SNDK', venue: 'xyz', base: 'SNDK', markPx: 1718.1 });
    const io = row({ key: 'io:SNDK', venue: 'io', base: 'SNDK', markPx: 1719.7 });
    expect([isSibling(stx, paraStx), isNameOnly(stx, paraStx)]).toEqual([false, true]);
    expect([isSibling(xyz, io), isNameOnly(xyz, io)]).toEqual([true, false]);
    expect(isNameOnly(stx, stx)).toBe(false);
  });
});

describe('open-interest memory (opt-in)', () => {
  const store = () => {
    const m = new Map<string, string>();
    return {
      m,
      getItem: (k: string) => m.get(k) ?? null,
      setItem: (k: string, v: string) => void m.set(k, v),
      removeItem: (k: string) => void m.delete(k),
    };
  };

  it('stores nothing until switched on, and deletes everything when switched off', () => {
    const s = store();
    const mem = oiMemory(s);
    expect(mem.isOn()).toBe(false);
    expect(s.m.size).toBe(0);
    mem.turnOn();
    mem.write({ at: 1, oi: { BTC: 10 } });
    expect(mem.read()).toEqual({ at: 1, oi: { BTC: 10 } });
    mem.turnOff();
    expect(s.m.size).toBe(0);
  });

  it('survives blocked storage', () => {
    const blocked = {
      getItem: () => {
        throw new Error('blocked');
      },
      setItem: () => {
        throw new Error('blocked');
      },
      removeItem: () => {
        throw new Error('blocked');
      },
    };
    const mem = oiMemory(blocked);
    expect(mem.isOn()).toBe(false);
    expect(() => mem.turnOn()).not.toThrow();
    expect(mem.read()).toBeNull();
  });

  it('compares contracts, not dollars, and leaves markets it did not remember missing', () => {
    const before = oiSnapshot(
      [row({ key: 'BTC', oiCoins: 10 }), row({ key: 'ETH', oiCoins: 0 })],
      1
    );
    expect(before.oi).toEqual({ BTC: 10 });
    const [btc, eth, sol] = withOiChange(
      [
        row({ key: 'BTC', oiCoins: 12, markPx: 50 }),
        row({ key: 'ETH', oiCoins: 5 }),
        row({ key: 'SOL' }),
      ],
      before
    );
    expect(btc.oiChange).toBeCloseTo(0.2, 10);
    expect(eth.oiChange).toBeNull();
    expect(sol.oiChange).toBeNull();
  });
});
