import type uPlot from 'uplot';

/** The page's chart colours (app/globals.css: --chart-axis, --chart-grid), in a form a canvas accepts. */
export interface ChartColours {
  axis: string;
  grid: string;
}

/**
 * A chart's options with its axes, grid and ticks in the page's colours:
 * uPlot draws them black on a canvas, which vanishes on the dark theme. A
 * chart's own axis settings win over these.
 */
export function themedAxes(options: uPlot.Options, colours: ChartColours): uPlot.Options {
  return {
    ...options,
    axes: (options.axes ?? [{}, {}]).map((a) => ({
      stroke: colours.axis,
      ...a,
      grid: { stroke: colours.grid, width: 1, ...a.grid },
      ticks: { stroke: colours.grid, width: 1, ...a.ticks },
    })),
  };
}
