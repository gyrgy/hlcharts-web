'use client';
/**
 * A uPlot chart in a container: created when data first arrives, updated in
 * place after that, resized with the container, destroyed on unmount. A change
 * of `rebuildKey` (another interval, another range) or of the light/dark
 * theme starts a fresh chart, its axes in the theme's colours (themed-axes.ts).
 * uPlot is loaded in the browser only (pages are pre-rendered at build).
 * Times are drawn in UTC.
 */
import { useTheme } from 'next-themes';
import { RefObject, useEffect, useRef } from 'react';
import type uPlot from 'uplot';
import 'uplot/dist/uPlot.min.css';
import { ChartColours, themedAxes } from './themed-axes';

/** The page's chart colours now; null if the stylesheet does not define them. */
function pageColours(): ChartColours | null {
  const css = getComputedStyle(document.documentElement);
  const axis = css.getPropertyValue('--chart-axis').trim();
  const grid = css.getPropertyValue('--chart-grid').trim();
  return axis && grid ? { axis, grid } : null;
}

export function useUPlot(
  container: RefObject<HTMLDivElement | null>,
  makeOptions: (width: number, lib: typeof uPlot) => uPlot.Options,
  data: uPlot.AlignedData | null,
  height: number,
  rebuildKey: string
): void {
  const chart = useRef<{ plot: uPlot; observer: ResizeObserver; key: string } | null>(null);
  const options = useRef(makeOptions);
  options.current = makeOptions;
  const { resolvedTheme } = useTheme();
  const key = `${rebuildKey}|${resolvedTheme ?? ''}`;

  useEffect(() => {
    const el = container.current;
    if (!el || !data) return;
    let stopped = false;
    // The options that belong to this `data`, taken now: by the time uPlot has
    // loaded, a newer render may have replaced options.current (one more market's
    // line, say) before this effect is cleaned up, and uPlot fails on a series
    // with no data ("Cannot read properties of undefined (reading 'length')").
    const make = options.current;
    void import('uplot').then(({ default: UPlot }) => {
      if (stopped) return;
      if (chart.current && chart.current.key === key) {
        chart.current.plot.setData(data);
        return;
      }
      chart.current?.observer.disconnect();
      chart.current?.plot.destroy();
      const made = make(el.clientWidth, UPlot);
      const colours = pageColours();
      const plot = new UPlot(
        {
          ...(colours ? themedAxes(made, colours) : made),
          height,
          tzDate: (ts: number) => UPlot.tzDate(new Date(ts * 1000), 'Etc/UTC'),
        },
        data,
        el
      );
      const observer = new ResizeObserver(() => plot.setSize({ width: el.clientWidth, height }));
      observer.observe(el);
      chart.current = { plot, observer, key };
    });
    return () => {
      stopped = true;
    };
  }, [container, data, height, key]);

  useEffect(
    () => () => {
      chart.current?.observer.disconnect();
      chart.current?.plot.destroy();
      chart.current = null;
    },
    []
  );
}
