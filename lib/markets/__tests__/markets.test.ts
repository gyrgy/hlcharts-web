/**
 * The markets table's numbers. Each test is a way the page would show a
 * plausible but wrong figure: a spot row with another pair's numbers, a cap
 * on the wrong market, a missing value shown as zero.
 */
import { describe, expect, it } from 'vitest';
import { ago, bps, MISSING, pct, pctSigned, price, usdCompact } from '../../format/format';
import { PerpAssetCtx, PerpDex, SpotMetaAndAssetCtxs } from '../../hl/types';
import { PerpRow, Tick } from '../../live/market-store';
import { buildPerpRows } from '../build-perp-rows';
import { buildSpotRows } from '../build-spot-rows';
import { sortRows } from '../sort-rows';

const ctx = (o: Partial<PerpAssetCtx> = {}): PerpAssetCtx => ({
  funding: '0.0000125',
  openInterest: '10',
  prevDayPx: '100',
  dayNtlVlm: '5000000',
  premium: '-0.0003',
  oraclePx: '100',
  markPx: '101',
  midPx: '101',
  impactPxs: ['100.95', '101.05'],
  dayBaseVlm: '50000',
  ...o,
});
const perp = (
  dex: string,
  name: string,
  c: PerpAssetCtx,
  extra: Partial<PerpRow['market']> = {}
): PerpRow => ({
  dex,
  market: { name, szDecimals: 2, maxLeverage: 20, ...extra },
  ctx: c,
  ctxAt: 0,
});
const noTicks = (): Tick | undefined => undefined;
const XYZ: PerpDex = {
  name: 'xyz',
  fullName: 'XYZ',
  deployer: '0x1',
  oracleUpdater: null,
  feeRecipient: null,
  assetToStreamingOiCap: [['xyz:TSLA', '2020']],
  assetToFundingMultiplier: [],
  assetToFundingInterestRate: [],
  assetToFundingClamp: [],
};
const DEXES = new Map<string, PerpDex | null>([
  ['', null],
  ['xyz', XYZ],
]);

describe('perp rows', () => {
  it('computes change, open interest in dollars, basis and the cost to trade from the live figures', () => {
    const [r] = buildPerpRows([perp('', 'BTC', ctx())], noTicks, DEXES, new Set());
    expect(r.change24h).toBeCloseTo(0.01, 10);
    expect(r.oiUsd).toBeCloseTo(1010, 10);
    expect(r.basisBps).toBeCloseTo(100, 10);
    expect(r.impactSpreadBps).toBeCloseTo((0.1 / 101) * 10_000, 10);
    expect(r.fundingHourly).toBeCloseTo(0.0000125, 10);
    expect(r.volume24h).toBe(5_000_000);
  });

  it('uses the newer 1 s price tick for the price and everything priced from it', () => {
    const [r] = buildPerpRows(
      [perp('', 'BTC', ctx())],
      () => ({ markPx: '110', at: 1 }),
      DEXES,
      new Set()
    );
    expect(r.markPx).toBe(110);
    expect(r.oiUsd).toBeCloseTo(1100, 10);
    expect(r.change24h).toBeCloseTo(0.1, 10);
  });

  it("puts a builder exchange's cap on its own market only, and the at-cap flag on main-exchange markets only", () => {
    const rows = buildPerpRows(
      [perp('xyz', 'xyz:TSLA', ctx()), perp('', 'TSLA', ctx()), perp('', 'FTM', ctx())],
      noTicks,
      DEXES,
      new Set(['FTM', 'xyz:TSLA'])
    );
    const [xyz, main, ftm] = rows;
    expect(xyz.name).toBe('TSLA');
    expect(xyz.venue).toBe('xyz');
    expect(xyz.capUse).toBeCloseTo(1010 / 2020, 10);
    expect(xyz.atCap).toBe(false);
    expect(main.capUse).toBeNull();
    expect(main.atCap).toBe(false);
    expect(ftm.atCap).toBe(true);
  });

  it('leaves values Hyperliquid did not send missing, never zero', () => {
    const [r] = buildPerpRows(
      [perp('', 'NEW', ctx({ impactPxs: null, premium: null, prevDayPx: '0' }))],
      noTicks,
      DEXES,
      new Set()
    );
    expect(r.impactSpreadBps).toBeNull();
    expect(r.premium).toBeNull();
    expect(r.change24h).toBeNull();
  });

  it('flags delisted and isolated-only markets', () => {
    const rows = buildPerpRows(
      [
        perp('', 'OLD', ctx(), { isDelisted: true }),
        perp('', 'ISO', ctx(), { marginMode: 'strictIsolated' }),
      ],
      noTicks,
      DEXES,
      new Set()
    );
    expect(rows.map((r) => [r.delisted, r.isolatedOnly])).toEqual([
      [true, false],
      [false, true],
    ]);
  });
});

describe('spot rows', () => {
  // Real quirks (2026-10-04): contexts not in pair order, extra contexts for
  // prediction markets and former pairs, and pairs naming tokens by id.
  const snapshot: SpotMetaAndAssetCtxs = [
    {
      universe: [
        { tokens: [150, 0], name: '@107', index: 107, isCanonical: false },
        { tokens: [1, 0], name: 'PURR/USDC', index: 0, isCanonical: true },
        { tokens: [150, 360], name: '@200', index: 200, isCanonical: false },
      ],
      tokens: [
        { name: 'USDC', index: 0, szDecimals: 8, weiDecimals: 8, isCanonical: true },
        { name: 'PURR', index: 1, szDecimals: 0, weiDecimals: 5, isCanonical: true },
        { name: 'HYPE', index: 150, szDecimals: 2, weiDecimals: 8, isCanonical: false },
        { name: 'USDH', index: 360, szDecimals: 2, weiDecimals: 8, isCanonical: false },
      ],
    },
    [
      {
        coin: '#70411',
        prevDayPx: '0.5',
        dayNtlVlm: '1',
        markPx: '0.6',
        midPx: '0.6',
        circulatingSupply: '1',
        totalSupply: '1',
        dayBaseVlm: '1',
      },
      {
        coin: 'PURR/USDC',
        prevDayPx: '0.16',
        dayNtlVlm: '1849870',
        markPx: '0.17',
        midPx: '0.17',
        circulatingSupply: '594791863',
        totalSupply: '594791874',
        dayBaseVlm: '1',
      },
      {
        coin: '@71',
        prevDayPx: '9',
        dayNtlVlm: '9',
        markPx: '9',
        midPx: '9',
        circulatingSupply: '9',
        totalSupply: '9',
        dayBaseVlm: '9',
      },
      {
        coin: '@200',
        prevDayPx: '88',
        dayNtlVlm: '1000',
        markPx: '90',
        midPx: '90',
        circulatingSupply: '298603279',
        totalSupply: '998887342',
        dayBaseVlm: '1',
      },
      {
        coin: '@107',
        prevDayPx: '88.158',
        dayNtlVlm: '32786396',
        markPx: '90.102',
        midPx: '90.1',
        circulatingSupply: '298603279',
        totalSupply: '998887342',
        dayBaseVlm: '1',
      },
    ],
  ];

  it('matches each pair to its own context by name, names it from token ids, and leaves out the rest', () => {
    const rows = buildSpotRows(snapshot, noTicks);
    expect(rows.map((r) => [r.key, r.name, r.markPx])).toEqual([
      ['@107', 'HYPE/USDC', 90.102],
      ['PURR/USDC', 'PURR/USDC', 0.17],
      ['@200', 'HYPE/USDH', 90],
    ]);
  });

  it('publishes no market cap: Hyperliquid supply fields are not circulating supply', () => {
    const [hype] = buildSpotRows(snapshot, noTicks);
    expect(Object.keys(hype)).not.toContain('marketCap');
    expect(hype.impactSpreadBps).toBeNull();
  });
});

describe('sorting and formats', () => {
  it('sorts by value and keeps rows without one last in both directions', () => {
    const rows = buildPerpRows(
      [
        perp('', 'A', ctx({ dayNtlVlm: '5' })),
        perp('', 'B', ctx({ impactPxs: null, dayNtlVlm: '9' })),
        perp('', 'C', ctx({ dayNtlVlm: '7' })),
      ],
      noTicks,
      DEXES,
      new Set()
    );
    expect(sortRows(rows, 'volume24h', true).map((r) => r.key)).toEqual(['B', 'C', 'A']);
    expect(sortRows(rows, 'impactSpreadBps', true).at(-1)?.key).toBe('B');
    expect(sortRows(rows, 'impactSpreadBps', false).at(-1)?.key).toBe('B');
  });

  it('formats dollars, prices and rates, and a missing value as a dash, not 0', () => {
    expect(usdCompact(1_234_000_000)).toBe('$1.23B');
    expect(usdCompact(45_600_000)).toBe('$45.6M');
    expect(usdCompact(789_000)).toBe('$789K');
    expect(usdCompact(null)).toBe(MISSING);
    expect(price(85136)).toBe('85,136');
    expect(price(0.17095)).toBe('0.17095');
    expect(pctSigned(0.0123)).toBe('+1.23%');
    expect(pctSigned(-0.0000125, 4)).toBe('-0.0013%');
    expect(pct(0.502)).toBe('50.2%');
    expect(bps(null)).toBe(MISSING);
    expect(ago(12_000)).toBe('12 s');
    expect(ago(59_400)).toBe('59 s');
    expect(ago(5 * 60_000)).toBe('5 min');
    expect(ago(3 * 3_600_000)).toBe('3 h');
  });
});
