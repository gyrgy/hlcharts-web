/**
 * Draws candles on a uPlot chart whose series 1-4 are open, high, low and
 * close (uPlot has no candle type; those series stay invisible and only set
 * the price scale and the legend).
 */
import type uPlot from 'uplot';

export const UP_COLOUR = '#16a34a';
export const DOWN_COLOUR = '#dc2626';

export function candlesPlugin(): uPlot.Plugin {
  return {
    hooks: {
      draw: (u: uPlot) => {
        const [xs, opens, highs, lows, closes] = u.data as unknown as number[][];
        const ctx = u.ctx;
        const [i0, i1] = [u.series[0].idxs?.[0] ?? 0, u.series[0].idxs?.[1] ?? xs.length - 1];
        const step =
          xs.length > 1 ? u.valToPos(xs[1], 'x', true) - u.valToPos(xs[0], 'x', true) : 10;
        const body = Math.max(1, Math.min(14, step * 0.7));
        ctx.save();
        for (let i = i0; i <= i1; i++) {
          const x = Math.round(u.valToPos(xs[i], 'x', true));
          const o = u.valToPos(opens[i], 'y', true);
          const c = u.valToPos(closes[i], 'y', true);
          const h = u.valToPos(highs[i], 'y', true);
          const l = u.valToPos(lows[i], 'y', true);
          ctx.strokeStyle = ctx.fillStyle = closes[i] >= opens[i] ? UP_COLOUR : DOWN_COLOUR;
          ctx.beginPath();
          ctx.moveTo(x + 0.5, h);
          ctx.lineTo(x + 0.5, l);
          ctx.stroke();
          ctx.fillRect(
            Math.round(x - body / 2),
            Math.min(o, c),
            Math.round(body),
            Math.max(1, Math.abs(c - o))
          );
        }
        ctx.restore();
      },
    },
  };
}
