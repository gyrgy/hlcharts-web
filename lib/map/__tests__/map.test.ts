/** The market map: log axes, which markets get a point, bubble sizes, and hover targeting. */
import { describe, expect, it } from 'vitest';
import { ENRICHED_DEFAULTS, MarketRow } from '../../markets/types';
import { logAxis } from '../log-axis';
import { BUBBLE_MAX_PX, BUBBLE_MIN_PX, MapPoint, mapPoints } from '../map-points';
import { nearestPoint } from '../nearest-point';
import { BUILDER_COLOURS, MAIN_COLOUR, venueColours } from '../venue-colours';

const row = (o: Partial<MarketRow> & Pick<MarketRow, 'key'>): MarketRow => ({
  kind: 'perp',
  venue: '',
  name: o.key,
  href: `/perps/${o.key.toLowerCase()}/`,
  base: o.key,
  markPx: 1,
  change24h: 0,
  volume24h: 1_000,
  oiCoins: 1,
  oiUsd: 1_000,
  fundingHourly: 0,
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
const box = { left: 0, right: 100, top: 0, bottom: 100 };

describe('log axis', () => {
  it('spans whole decades around the values and maps them to pixels', () => {
    const a = logAxis([0.111, 244], 100, 0);
    expect(a.ticks).toEqual([0.1, 1, 10, 100, 1000]);
    expect(a.pos(0.1)).toBeCloseTo(100, 10);
    expect(a.pos(1000)).toBeCloseTo(0, 10);
    expect(a.pos(10)).toBeCloseTo(50, 10);
  });

  it('keeps at least one decade when every value is the same', () => {
    expect(logAxis([5, 5], 0, 10).ticks).toEqual([1, 10]);
  });

  it('refuses an axis with nothing positive on it', () => {
    expect(() => logAxis([0, -1, NaN], 0, 1)).toThrow();
  });
});

describe('market map points', () => {
  it('places live perps only and counts the ones it cannot place', () => {
    const m = mapPoints(
      [
        row({ key: 'BTC', volume24h: 1e8, impactSpreadBps: 0.1 }),
        row({ key: 'DEAD', delisted: true }),
        row({ key: '@1', kind: 'spot', impactSpreadBps: null }),
        row({ key: 'QUIET', volume24h: 0 }),
        row({ key: 'NOIMPACT', impactSpreadBps: null }),
        row({ key: 'para:X', venue: 'para', volume24h: 10, impactSpreadBps: 100 }),
      ],
      box
    );
    expect(m?.points.map((p) => p.key).sort()).toEqual(['BTC', 'para:X']);
    expect(m?.noVolume).toBe(1);
    expect(m?.noSpread).toBe(1);
    const btc = m!.points.find((p) => p.key === 'BTC')!;
    expect([btc.x, btc.y]).toEqual([100, 100]); // most volume, narrowest spread: bottom right
  });

  it('sizes bubble area by open interest, with a floor, largest drawn first', () => {
    const m = mapPoints(
      [row({ key: 'S', oiUsd: 1e6 }), row({ key: 'L', oiUsd: 4e8 }), row({ key: 'M', oiUsd: 1e8 })],
      box
    )!;
    expect(m.points.map((p) => p.key)).toEqual(['L', 'M', 'S']);
    expect(m.points[0].r).toBeCloseTo(BUBBLE_MAX_PX, 10);
    expect(m.points[1].r).toBeCloseTo(BUBBLE_MAX_PX / 2, 10); // a quarter of the OI, half the radius
    expect(m.points[2].r).toBe(BUBBLE_MIN_PX);
    expect(m.floorOi).toBeCloseTo(4e8 * (BUBBLE_MIN_PX / BUBBLE_MAX_PX) ** 2, 4);
  });

  it('returns nothing when no market can be placed', () => {
    expect(mapPoints([row({ key: 'Q', volume24h: 0 })], box)).toBeNull();
  });
});

describe('hover target', () => {
  const p = (key: string, x: number, y: number, r: number): MapPoint => ({
    key,
    name: key,
    venue: '',
    href: '/',
    volume24h: 1,
    spreadBps: 1,
    oiUsd: 1,
    x,
    y,
    r,
  });
  const big = p('BIG', 50, 50, 28);
  const small = p('SMALL', 60, 50, 2.5);

  it('reaches a small market drawn on top of a large bubble', () => {
    expect(nearestPoint([big, small], 59, 50, 8)?.key).toBe('SMALL');
    expect(nearestPoint([big, small], 45, 50, 8)?.key).toBe('BIG');
  });

  it('finds nothing beyond reach', () => {
    expect(nearestPoint([small], 80, 50, 8)).toBeNull();
    expect(nearestPoint([small], 66, 50, 8)?.key).toBe('SMALL');
  });
});

describe('venue colours', () => {
  it('keeps the main exchange one colour and gives builders the palette in order', () => {
    const c = venueColours(['', 'xyz', 'io']);
    expect([c.get(''), c.get('xyz'), c.get('io')]).toEqual([
      MAIN_COLOUR,
      BUILDER_COLOURS[0],
      BUILDER_COLOURS[1],
    ]);
  });
});
