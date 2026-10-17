/** The treemap layout: areas in proportion, inside the rectangle, no overlaps, nothing for nothing. */
import { describe, expect, it } from 'vitest';
import { Rect, squarify } from '../squarify';

const box: Rect = { x: 10, y: 20, w: 600, h: 400 };
const overlap = (a: Rect, b: Rect): number =>
  Math.max(0, Math.min(a.x + a.w, b.x + b.w) - Math.max(a.x, b.x)) *
  Math.max(0, Math.min(a.y + a.h, b.y + b.h) - Math.max(a.y, b.y));

describe('squarify', () => {
  // Open interest on 2026-10-04 spans five orders of magnitude; so does this.
  const values = [3.28e9, 1.2e9, 6e8, 2.5e8, 9e7, 3e7, 3e6, 3e5, 3e4, 5e8, 7e6];
  const tiles = squarify(values, box);
  const total = values.reduce((s, v) => s + v, 0);

  it('gives each value its share of the area, in input order', () => {
    values.forEach((v, i) =>
      expect((tiles[i].w * tiles[i].h) / (box.w * box.h)).toBeCloseTo(v / total, 9)
    );
  });

  it('keeps every tile inside the rectangle', () => {
    for (const t of tiles) {
      expect(t.x).toBeGreaterThanOrEqual(box.x - 1e-9);
      expect(t.y).toBeGreaterThanOrEqual(box.y - 1e-9);
      expect(t.x + t.w).toBeLessThanOrEqual(box.x + box.w + 1e-6);
      expect(t.y + t.h).toBeLessThanOrEqual(box.y + box.h + 1e-6);
    }
  });

  it('never overlaps two tiles', () => {
    for (let i = 0; i < tiles.length; i++)
      for (let j = i + 1; j < tiles.length; j++)
        expect(overlap(tiles[i], tiles[j])).toBeLessThan(1e-6);
  });

  it('keeps every tile close to square, the small ones too (3.9:1 at worst here)', () => {
    // Laying everything out in columns still tiles the area, but cuts 73:1 slivers.
    for (const t of tiles) expect(Math.max(t.w / t.h, t.h / t.w)).toBeLessThan(5);
  });

  it('gives zero, negative and missing values an empty tile', () => {
    const r = squarify([5, 0, -1, NaN, 5], box);
    expect([r[1].w * r[1].h, r[2].w * r[2].h, r[3].w * r[3].h]).toEqual([0, 0, 0]);
    expect(r[0].w * r[0].h + r[4].w * r[4].h).toBeCloseTo(box.w * box.h, 6);
  });

  it('returns empty tiles for nothing to lay out', () => {
    expect(squarify([], box)).toEqual([]);
    expect(squarify([0], box)).toEqual([{ x: 10, y: 20, w: 0, h: 0 }]);
  });
});
