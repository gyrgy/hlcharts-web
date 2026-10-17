/**
 * `/markets.json`: every market the build wrote a page for (plan §3.1, §3.6).
 * The header search reads it, and it is published for anyone else as the
 * universe as of the build. It carries no figures: those are live.
 */
export interface SearchEntry {
  /** As shown: "BTC", "NVDA" (on xyz), "HYPE/USDC". */
  name: string;
  /** Upper case: the perp's name without its exchange, the spot pair's base token. */
  base: string;
  /** "main", a builder exchange's name, or "spot". */
  venue: string;
  kind: 'perp' | 'spot';
  path: string;
  delisted: boolean;
}

export interface SearchIndex {
  builtAt: string;
  markets: SearchEntry[];
}
