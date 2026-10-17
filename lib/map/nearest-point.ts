/**
 * The bubble under the pointer: the nearest centre among bubbles the pointer
 * is inside or within `reach` pixels of. Picks by centre distance, so a small
 * market drawn on top of a large bubble stays reachable.
 */
import { MapPoint } from './map-points';

export function nearestPoint(
  points: readonly MapPoint[],
  x: number,
  y: number,
  reach: number
): MapPoint | null {
  let best: MapPoint | null = null;
  let bestD = Infinity;
  for (const p of points) {
    const d = Math.hypot(p.x - x, p.y - y);
    if (d <= Math.max(p.r, reach) && d < bestD) {
      best = p;
      bestD = d;
    }
  }
  return best;
}
