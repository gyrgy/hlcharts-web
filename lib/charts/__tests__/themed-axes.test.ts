/** Canvas charts take the page's axis colours, without losing what a chart set itself. */
import type uPlot from 'uplot';
import { describe, expect, it } from 'vitest';
import { themedAxes } from '../themed-axes';

const COLOURS = { axis: '#a1a1aa', grid: 'rgba(255, 255, 255, 0.1)' };
const base: uPlot.Options = { width: 600, height: 300, series: [{}] };

describe('themedAxes', () => {
  it("colours every axis's labels, grid and ticks", () => {
    const axes = themedAxes({ ...base, axes: [{}, { size: 70 }] }, COLOURS).axes ?? [];
    expect(axes).toHaveLength(2);
    for (const a of axes) {
      expect(a.stroke).toBe(COLOURS.axis);
      expect(a.grid?.stroke).toBe(COLOURS.grid);
      expect(a.ticks?.stroke).toBe(COLOURS.grid);
    }
    expect(axes[1].size).toBe(70);
  });

  it("keeps a chart's own settings, a hidden grid included", () => {
    const axes =
      themedAxes(
        { ...base, axes: [{}, { scale: 'p', stroke: 'red', grid: { show: false } }] },
        COLOURS
      ).axes ?? [];
    expect(axes[1].stroke).toBe('red');
    expect(axes[1].grid?.show).toBe(false);
    expect(axes[1].grid?.stroke).toBe(COLOURS.grid);
    expect(axes[1].scale).toBe('p');
  });

  it('themes the default x and y axes when a chart sets none', () => {
    const axes = themedAxes(base, COLOURS).axes ?? [];
    expect(axes.map((a) => a.stroke)).toEqual([COLOURS.axis, COLOURS.axis]);
  });
});
