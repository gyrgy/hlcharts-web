/** Sort rows by one numeric (or name) column; rows without a value always go last, whatever the direction. */
import { sortBy } from './sort-by';
import { MarketRow } from './types';

export type SortKey = Exclude<
  keyof MarketRow,
  'kind' | 'venue' | 'href' | 'base' | 'atCap' | 'delisted' | 'isolatedOnly' | 'alsoOn'
>;

export function sortRows(rows: readonly MarketRow[], key: SortKey, desc: boolean): MarketRow[] {
  return sortBy(rows, (r) => r[key] as number | string | null, desc);
}
