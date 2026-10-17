/**
 * The home page's market map (plan §3.3): every live perp placed by 24 h
 * volume (x) and impact spread (y), both on log scales, with bubble AREA in
 * proportion to open interest. Open interest spans five orders of magnitude
 * ($30k to $3.3B on 2026-10-04), so bubbles have a floor size and the markets
 * under `floorOi` all share it. Spot is left out: its contexts carry no impact
 * prices. Markets that cannot be placed are counted, not silently dropped.
 */
import { LogAxis, logAxis } from './log-axis';
import { MarketRow } from '../markets/types';

export const BUBBLE_MAX_PX = 28;
export const BUBBLE_MIN_PX = 2.5;

export interface MapPoint {
  key: string;
  name: string;
  venue: string;
  href: string;
  volume24h: number;
  spreadBps: number;
  oiUsd: number;
  x: number;
  y: number;
  r: number;
}

export interface MarketMap {
  /** Largest bubble first, so small ones are drawn on top. */
  points: MapPoint[];
  x: LogAxis;
  y: LogAxis;
  maxOi: number;
  /** Open interest below this draws at the floor size. */
  floorOi: number;
  /** Live perps with no trade in 24 h: a log scale has no place for 0. */
  noVolume: number;
  /** Live perps without impact prices. */
  noSpread: number;
}

export interface PlotBox {
  left: number;
  right: number;
  top: number;
  bottom: number;
}

export function mapPoints(rows: readonly MarketRow[], box: PlotBox): MarketMap | null {
  const live = rows.filter((r) => r.kind === 'perp' && !r.delisted);
  const spread = (r: MarketRow): number => r.impactSpreadBps ?? NaN;
  const withSpread = live.filter((r) => spread(r) > 0);
  const placed = withSpread.filter((r) => r.volume24h > 0);
  if (!placed.length) return null;

  const x = logAxis(
    placed.map((r) => r.volume24h),
    box.left,
    box.right
  );
  const y = logAxis(placed.map(spread), box.bottom, box.top);
  const maxOi = Math.max(0, ...placed.map((r) => r.oiUsd ?? 0));
  const radius = (oi: number): number =>
    maxOi > 0 ? Math.max(BUBBLE_MIN_PX, BUBBLE_MAX_PX * Math.sqrt(oi / maxOi)) : BUBBLE_MIN_PX;

  const points = placed
    .map((r) => ({
      key: r.key,
      name: r.name,
      venue: r.venue,
      href: r.href,
      volume24h: r.volume24h,
      spreadBps: spread(r),
      oiUsd: r.oiUsd ?? 0,
      x: x.pos(r.volume24h),
      y: y.pos(spread(r)),
      r: radius(r.oiUsd ?? 0),
    }))
    .sort((a, b) => b.r - a.r);

  return {
    points,
    x,
    y,
    maxOi,
    floorOi: maxOi * (BUBBLE_MIN_PX / BUBBLE_MAX_PX) ** 2,
    noVolume: withSpread.length - placed.length,
    noSpread: live.length - withSpread.length,
  };
}
