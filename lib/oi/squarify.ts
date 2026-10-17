/**
 * Squarified treemap layout (Bruls, Huizing and van Wijk, 2000): divides a
 * rectangle into one tile per value, each tile's area in proportion to its
 * value, keeping tiles as close to square as the order allows. Values are laid
 * out largest first; the result is in input order. A value of 0 (or less, or
 * not a number) gets an empty tile at the rectangle's corner.
 */
export interface Rect {
  x: number;
  y: number;
  w: number;
  h: number;
}

/** The worst (largest) aspect ratio in a strip of areas laid along a side of this length. */
function worst(areas: readonly number[], side: number): number {
  const sum = areas.reduce((s, a) => s + a, 0);
  const max = Math.max(...areas);
  const min = Math.min(...areas);
  return Math.max((side * side * max) / (sum * sum), (sum * sum) / (side * side * min));
}

export function squarify(values: readonly number[], rect: Rect): Rect[] {
  const out: Rect[] = values.map(() => ({ x: rect.x, y: rect.y, w: 0, h: 0 }));
  const usable = values
    .map((v, i) => ({ v, i }))
    .filter((e) => e.v > 0 && Number.isFinite(e.v))
    .sort((a, b) => b.v - a.v);
  const total = usable.reduce((s, e) => s + e.v, 0);
  if (!usable.length || rect.w <= 0 || rect.h <= 0) return out;
  const scale = (rect.w * rect.h) / total;
  const items = usable.map((e) => ({ i: e.i, a: e.v * scale }));

  let free = { ...rect };
  const place = (strip: { i: number; a: number }[]): void => {
    const sum = strip.reduce((s, e) => s + e.a, 0);
    if (free.w >= free.h) {
      // A column on the left, tiles stacked down it.
      const w = sum / free.h;
      let y = free.y;
      for (const e of strip) {
        const h = e.a / w;
        out[e.i] = { x: free.x, y, w, h };
        y += h;
      }
      free = { x: free.x + w, y: free.y, w: free.w - w, h: free.h };
    } else {
      // A row along the top, tiles side by side.
      const h = sum / free.w;
      let x = free.x;
      for (const e of strip) {
        const w = e.a / h;
        out[e.i] = { x, y: free.y, w, h };
        x += w;
      }
      free = { x: free.x, y: free.y + h, w: free.w, h: free.h - h };
    }
  };

  let strip: { i: number; a: number }[] = [];
  for (const item of items) {
    const side = Math.min(free.w, free.h);
    const areas = strip.map((e) => e.a);
    if (!strip.length || worst([...areas, item.a], side) <= worst(areas, side)) {
      strip.push(item);
    } else {
      place(strip);
      strip = [item];
    }
  }
  place(strip);
  return out;
}
