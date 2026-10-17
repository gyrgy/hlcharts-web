/**
 * `/markets.json`, fetched once per visit and shared: the header search and
 * the 404 page both read it. A failed fetch is forgotten, so the next caller
 * tries again.
 */
import { SearchEntry, SearchIndex } from './types';

export const INDEX_PATH = '/markets.json';

let index: Promise<SearchEntry[]> | null = null;

export function loadIndex(): Promise<SearchEntry[]> {
  index ??= fetch(INDEX_PATH)
    .then((r) => {
      if (!r.ok) throw new Error(`HTTP ${r.status}`);
      return r.json() as Promise<SearchIndex>;
    })
    .then((i) => i.markets)
    .catch((e: unknown) => {
      index = null;
      throw e;
    });
  return index;
}
