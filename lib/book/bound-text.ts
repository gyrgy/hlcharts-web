/**
 * How book figures read (lib/book/book-figures.ts): an exact figure as is, a
 * bound as "at least" (depth) or "at most" (cost), and "not measured" where no
 * book reaches. Shared by the market pages' book panel and /liquidity, so a
 * figure reads the same on both.
 */
import { usdCompact } from '../format/format';
import { Bound } from './book-figures';

export const NOT_MEASURED = 'not measured';

export const depthText = (x: Bound | null): string =>
  x === null ? NOT_MEASURED : `${x.approximate ? 'at least ' : ''}${usdCompact(x.value)}`;

export const costText = (x: Bound | null): string =>
  x === null ? NOT_MEASURED : `${x.approximate ? 'at most ' : ''}${x.value.toFixed(1)} bp`;

/** ±10 bp, ±0.5%, ±1%, ±2% */
export const bandLabel = (b: number): string =>
  b < 0.005 ? `±${(b * 10_000).toFixed(0)} bp` : `±${(b * 100).toFixed(1).replace('.0', '')}%`;
