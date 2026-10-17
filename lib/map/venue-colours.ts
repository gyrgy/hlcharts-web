/**
 * One colour per perp exchange: the main exchange always the same, builder
 * exchanges in Hyperliquid's own order (perpDexs), so a venue keeps its colour
 * from one second to the next. Five exchanges had live markets on 2026-10-04;
 * past the palette's length colours repeat, which the legend makes visible.
 */
import { MAIN_DEX } from '../hl/constants';

export const MAIN_COLOUR = '#1c64d1';
export const BUILDER_COLOURS = [
  '#d9480f',
  '#2b8a3e',
  '#862e9c',
  '#c2255c',
  '#0b7285',
  '#5c940d',
  '#e67700',
  '#495057',
];

export function venueColours(venues: readonly string[]): Map<string, string> {
  const colours = new Map<string, string>();
  let i = 0;
  for (const v of venues) {
    if (v === MAIN_DEX) colours.set(v, MAIN_COLOUR);
    else colours.set(v, BUILDER_COLOURS[i++ % BUILDER_COLOURS.length]);
  }
  return colours;
}
