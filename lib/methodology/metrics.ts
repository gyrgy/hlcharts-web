/**
 * `/methodology` (plan §3.3): one entry per metric, each with a stable anchor
 * (`/methodology/#<id>`) that pages and, later, embeds and posts link to.
 * Definitions, not verdicts. Every dated figure below was measured on the day
 * it names; a later change of definition gets a CHANGELOG entry, because it
 * changes what anything already published meant.
 */
export interface Metric {
  id: string;
  name: string;
  /** What the figure is, in plain words. */
  what: string;
  formula?: string;
  /** Hyperliquid's public API: the request or feed the figure comes from. */
  source: string;
  refresh: string;
  /** The span of time one figure covers. */
  span: string;
  /** What can mislead, and what we checked. */
  traps: string[];
}

export const METRICS: Metric[] = [
  {
    id: 'live-data',
    name: 'Where every number comes from',
    what: "Your browser asks Hyperliquid's public API (api.hyperliquid.xyz) directly, on your own connection. Nothing passes through our servers. Two feeds carry every market at once over one connection; everything else is requested when a page needs it.",
    source:
      'Websocket feeds allDexsAssetCtxs (funding, open interest, premium, oracle, mark and impact prices for every perp) and fastAssetCtxs (mark and mid prices for every market); info requests for the rest.',
    refresh:
      'allDexsAssetCtxs every 15 s and fastAssetCtxs every 1 s (medians over 90 s, 2026-10-04). Spot figures every 5 min; Binance and Bybit funding and the at-cap list every minute; lending every minute on /lending.',
    span: 'Each figure is as of its last update; the header shows whether the live connection is up.',
    traps: [
      'Hyperliquid limits how much one address may request per minute. Each browser tab spends at most about 600 units a minute through one queue, waits when Hyperliquid asks it to, and slows long requests (90-day histories, measured books) to stay inside the limit.',
    ],
  },
  {
    id: 'price',
    name: 'Price',
    what: "The mark price Hyperliquid reports for the market. For spot, in the pair's quote token.",
    source: 'fastAssetCtxs (markPx); the contexts before the first tick arrives.',
    refresh: 'About every second.',
    span: 'Now.',
    traps: [],
  },
  {
    id: 'change-24h',
    name: 'Change over 24 hours',
    what: 'How far the price moved over the last 24 hours, rolling, not since midnight.',
    formula: 'mark price ÷ prevDayPx − 1',
    source: 'prevDayPx in the market contexts.',
    refresh: 'With the price.',
    span: 'The last 24 hours.',
    traps: [
      "Checked 2026-10-04: BTC's prevDayPx (84,978) equalled its price 24 hours earlier, not at 00:00 UTC (84,716).",
    ],
  },
  {
    id: 'volume-24h',
    name: 'Volume over 24 hours',
    what: "The value traded over the last 24 hours, rolling, in the market's settlement token: USDC for every perp exchange with live markets (2026-10-04); for spot, the pair's quote token.",
    source: 'dayNtlVlm in the market contexts.',
    refresh: 'Perps every 15 s; spot every 5 min.',
    span: 'The last 24 hours.',
    traps: [
      "Checked 2026-10-04: BTC's 24-hour base volume (7,132 BTC) lay between its volume since 00:00 UTC (5,932) and over the last 25 hours (7,702), so the window rolls.",
    ],
  },
  {
    id: 'open-interest',
    name: 'Open interest',
    what: "The value of a perp's open contracts: Hyperliquid's open-interest figure, in contracts, times the mark price.",
    formula: 'openInterest × mark price',
    source: 'openInterest in allDexsAssetCtxs.',
    refresh: 'Every 15 s.',
    span: 'Now.',
    traps: [
      'We read the figure as one side of the market: every long has a short, and each pair is counted once. The evidence is the caps (see cap use): read this way no market is over its cap; counting both sides would put six over (2026-10-04).',
      'Other sites may count open interest differently and show other totals. This is our definition, not a judgement of theirs.',
    ],
  },
  {
    id: 'funding',
    name: 'Funding rate',
    what: "The rate longs pay shorts (or shorts pay longs, when negative) at the end of the current hour, as a share of the position's value. Per year is the hourly rate × 24 × 365, not compounded.",
    formula:
      'rate (8 h) = average premium + clamp(interest − average premium, ± clamp); paid hourly at one eighth; builder exchanges multiply the whole rate by their multiplier; capped at 4% an hour',
    source:
      "funding in allDexsAssetCtxs; the formula from Hyperliquid's documentation (funding; HIP-3 deployer actions).",
    refresh: 'Every 15 s.',
    span: "This hour's rate so far: it moves until the hour ends.",
    traps: [
      'Main exchange: interest 0.01% and clamp 0.05% per 8 hours. Builder exchanges set their own; where they have not, the clamp defaults to 0.03% (documented), and the interest rate (0.01%) and multiplier (1) are inferred from live rates, not documented. On 2026-10-04, 49 builder markets sat exactly at the base rate those defaults give.',
      "Hyperliquid's own predicted rate is not shown separately: on 2026-10-04 it equalled this figure on 154 of 178 main-exchange perps and differed on the rest only by when each was sampled.",
    ],
  },
  {
    id: 'base-rate',
    name: 'Base rate, premium and the band',
    what: 'While the hour\'s average premium stays within the clamp of the interest rate (the band), funding is the base rate: the interest rate, times the multiplier on builder exchanges. Outside it, the premium sets the rate. "To band edge" is how far the latest premium sample sits inside (+) or outside (−) the band.',
    formula: 'band: interest − clamp ≤ premium ≤ interest + clamp (per 8 h)',
    source: 'premium in allDexsAssetCtxs.',
    refresh: 'Every 15 s.',
    span: "The premium is one sample (Hyperliquid samples every 5 seconds); the rate uses the hour's average.",
    traps: [
      'One sample and the average can disagree: on 2026-10-04 they did for 50 of 330 perps.',
      "Builder exchanges measure the premium from the midpoint of the impact prices, without the main exchange's band around the oracle.",
    ],
  },
  {
    id: 'mark-oracle-gap',
    name: 'Mark against oracle',
    what: 'How far the mark price sits from the oracle price, in basis points (hundredths of a percent).',
    formula: '(mark − oracle) ÷ oracle × 10,000',
    source: 'markPx and oraclePx in the contexts.',
    refresh: 'Every 15 s.',
    span: 'Now.',
    traps: [],
  },
  {
    id: 'impact-spread',
    name: 'Impact spread',
    what: 'What buying and immediately selling a set size costs, before fees: the gap between the average prices to buy and to sell that size at once, as a share of their midpoint.',
    formula: '(impact ask − impact bid) ÷ ((impact ask + impact bid) ÷ 2) × 10,000',
    source: 'impactPxs in allDexsAssetCtxs. Perps only: spot contexts carry no impact prices.',
    refresh: 'Every 15 s.',
    span: 'Now.',
    traps: [
      "The size differs: $20,000 on BTC and ETH and $6,000 on other main-exchange perps (Hyperliquid's contract specifications); builder exchanges do not publish theirs, so their figures may not compare exactly.",
      'Checked 2026-10-04 on 22 main-exchange perps against their live books: the impact prices matched the average fill for $6,000 to within about 1 bp, and were 3–20 bp from the price of the last level reached.',
    ],
  },
  {
    id: 'cex-funding',
    name: 'Funding against Binance and Bybit',
    what: "Binance's and Bybit's next predicted funding for the same coin, put on an hourly basis, and the gap between Hyperliquid's rate and their average.",
    formula:
      'their rate ÷ their interval (1, 4 or 8 hours); gap = Hyperliquid − average of those present',
    source: 'predictedFundings (main-exchange coins only).',
    refresh: 'Every minute.',
    span: 'Their next payment.',
    traps: [
      'An entry without an interval is left missing rather than assumed 8-hourly (20 Binance entries on 2026-10-04).',
    ],
  },
  {
    id: 'cap-use',
    name: 'Open-interest caps and cap use',
    what: "Each builder exchange caps every market's open interest in dollars. Cap use is open interest against that cap. The main exchange publishes no caps; it lists the markets at their cap.",
    formula: 'cap use = openInterest × mark price ÷ cap',
    source: 'perpDexs (per-market caps); perpsAtOpenInterestCap (main exchange).',
    refresh:
      'Caps when the page loads (every 5 min on /exchanges and /listings); the at-cap list every minute.',
    span: 'Now.',
    traps: [
      'Hyperliquid\'s documentation defines the caps as notional ("position size times mark price"). That cap use counts one side of open interest is our reading of live data: no market was over 100% that way (highest 85%, 2026-10-04).',
      "perpDexs and perpDexLimits gave identical per-market caps on all 10 builder exchanges (2026-10-04). The main exchange's at-cap list also holds delisted markets, which are left out.",
      '"At or near cap" means 80% or more of a builder market\'s cap, on every page.',
    ],
  },
  {
    id: 'exchange-cap',
    name: 'Exchange-wide cap',
    what: 'The cap a builder exchange sets on its total open interest, in dollars, and how much of it is used.',
    formula: "exchange's open interest ÷ totalOiCap",
    source: 'perpDexLimits (totalOiCap).',
    refresh: 'Every 5 min.',
    span: 'Now.',
    traps: [
      'perpDexLimits also returns a per-market size cap and a transfer limit, not shown: we cannot explain them from the documentation.',
    ],
  },
  {
    id: 'oi-volume',
    name: 'Open interest against volume',
    what: "Open interest divided by the last 24 hours' volume: above 1×, more is held open than traded in a day. A rough sign of how long positions stay open.",
    formula: 'open interest ÷ volume over 24 hours',
    source: 'As open interest and volume.',
    refresh: 'Every 15 s.',
    span: 'Now, against the last 24 hours.',
    traps: [],
  },
  {
    id: 'depth',
    name: 'Order-book depth',
    what: 'The value of orders resting within a band around the mid price, on one side of the book.',
    source:
      'l2Book: the 20 live levels on each side, and two grouped books (nSigFigs 4 and 3) that reach further.',
    refresh:
      'Market pages: live levels as they change, grouped books every 5 s. /liquidity: once, when you measure.',
    span: 'Now.',
    traps: [
      'Past the live levels the books are grouped into price buckets, priced outward (bids rounded down, asks up), so depth there reads low: shown as "at least". Where no book reaches the band, it says "not measured", never zero.',
      'Each figure is taken from the combination of books that reaches furthest; no single combination was best everywhere (2026-10-04).',
    ],
  },
  {
    id: 'cost-to-trade',
    name: 'Cost to trade',
    what: 'How far the average fill of a market order of a given size lands from the mid price, one way, in basis points.',
    source: 'As depth.',
    refresh: 'As depth.',
    span: 'Now.',
    traps: [
      'Bounds as for depth: "at most" past the live levels, "not measured" where the book is too thin.',
      'The impact spread covers a buy and a sell, so at the same size it is about the buy and sell costs added.',
    ],
  },
  {
    id: 'top-spread',
    name: 'Spread',
    what: 'Best bid to best ask, as a share of the mid price, in basis points.',
    source: 'l2Book, top level.',
    refresh: 'As depth.',
    span: 'Now.',
    traps: [],
  },
  {
    id: 'funding-history',
    name: 'Funding history and what a long paid',
    what: 'The hourly rates applied in the past. "Paid by a long" is their sum over the period: the share of a long position\'s value paid in funding, if its value stayed the same (negative: received).',
    source: 'fundingHistory.',
    refresh: 'Loaded when you open a chart.',
    span: '7, 21 or 90 days.',
    traps: [
      'fundingHistory returns the first 500 hours after the start, not the latest, so longer periods are read page by page.',
      'Hours are stamped a few milliseconds after the hour (4–90 ms, 2026-10-04) and are aligned by rounding.',
    ],
  },
  {
    id: 'lending',
    name: 'Lending',
    what: "Hyperliquid's built-in lending: per token, supplied and borrowed (in tokens, and in dollars at the reply's oracle price), the share lent out, and the yearly supply and borrow rates.",
    formula:
      'lent out = borrowed ÷ supplied; borrow rate = 5% + 4.75 × max(0, lent out − 80%) for stablecoins; supply rate = borrow rate × lent out × 0.9',
    source:
      "allBorrowLendReserveStates; the formula from Hyperliquid's documentation (portfolio margin).",
    refresh: 'Every minute on /lending; every 5 min on the home page.',
    span: 'Now.',
    traps: [
      "Checked 2026-10-04: all five tokens' live rates matched the formula within 1e-11. Every token was below 80% lent out, so the steep part above it rests on the documentation alone.",
      'A token whose rates leave the formula is shown as reported, without the explanation.',
    ],
  },
  {
    id: 'listing-auction',
    name: 'Listing auction',
    what: 'The Dutch auction for the right to list one more perp, shared by all builder exchanges: the price, in HYPE, falls in a straight line for 31 hours to 500 HYPE, and the first to pay it gets the listing.',
    formula:
      'start price = twice the last sale price, or 500 HYPE if the last auction found no buyer',
    source: "perpDeployAuctionStatus; the rule from Hyperliquid's documentation (HIP-1, HIP-3).",
    refresh: 'Every 5 min; the price between refreshes is drawn from the rule.',
    span: 'The current auction.',
    traps: [
      'Checked 2026-10-04: reported 752.52 HYPE, the rule gave 752.51. If the reported price leaves the line, it is shown as reported, without the explanation.',
    ],
  },
  {
    id: 'leverage-margin',
    name: 'Leverage and margin',
    what: 'The most leverage a position may use, lower for larger positions where the market has tiers, and whether it may share margin with other positions.',
    source: 'allPerpMetas (maxLeverage, marginTables, marginMode).',
    refresh: 'Every 5 min.',
    span: 'Now.',
    traps: [
      "Tiers are by position value in USDC (Hyperliquid's margin tiers: BTC 40× up to 150M, 20× above). A market whose table is not listed has one tier at its max leverage: the table id equalled max leverage for all 292 such markets (2026-10-04).",
      '"Isolated only" (noCross): a position cannot share margin. "Margin locked" (strictIsolated): in addition, margin cannot be taken out of an open position. The older onlyIsolated flag marks either.',
      "Growth mode and fee scale are fee settings, shown as set: two documentation pages describe growth mode's effect differently.",
    ],
  },
  {
    id: 'same-asset',
    name: 'The same asset on several venues',
    what: 'Markets on different venues are the same asset when they have the same name and their prices are within 2% of each other.',
    source: 'As price.',
    refresh: 'As price.',
    span: 'Now.',
    traps: [
      'The name alone is not enough: main STX was $0.40 and para:STX $848 (2026-10-04). Different names (UBTC on spot, BTC perp) are not matched: no guessing.',
      'Delisted markets and spot pairs with no trade in 24 hours carry stale prices and take no part.',
    ],
  },
  {
    id: 'venue-totals',
    name: 'Totals per exchange',
    what: "Open interest and volume summed over an exchange's live markets; its share of all builder-exchange open interest.",
    source: 'As open interest and volume.',
    refresh: 'Every 15 s.',
    span: 'Now; volume over the last 24 hours.',
    traps: [
      'Delisted markets take no part. A spot pair counts as live when it traded in the last 24 hours (117 of 330 on 2026-10-04).',
      'Spot volume sums only pairs quoted in USDC (99.97% of spot volume on 2026-10-04): other pairs are in other tokens, and adding them would mix units.',
      'Each perp exchange settles in one token, and its prices, volume and open interest are in it. On 2026-10-04 every exchange with live markets settled in USDC; five with none left settle in USDH (flx, vntl, km), USDE (hyna) or USDT0 (cash). Should one of those list markets again, its figures will be in that stablecoin, not USDC.',
    ],
  },
];

export interface ChangelogEntry {
  date: string;
  change: string;
}

/** Every definition change, newest first (plan §3.3). */
export const CHANGELOG: ChangelogEntry[] = [
  {
    date: '2026-10-04',
    change: "Definitions first published here (before the site's public release).",
  },
];
