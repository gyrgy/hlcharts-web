/**
 * `/learn` (plan §3.3): one page per term, each with a live chart so the
 * explanation can be checked against the market as it is. Dated figures were
 * measured or read on the day they name.
 */
export type TermChart =
  | 'funding-histogram'
  | 'premium-history'
  | 'market-map'
  | 'mark-oracle'
  | 'oi-treemap'
  | 'cap-use'
  | 'exchange-share'
  | 'spot-perp-basis'
  | 'book'
  | 'lending-curve'
  | 'fee-schedule'
  | 'builder-fee'
  | 'twap';

export interface LearnTerm {
  slug: string;
  term: string;
  summary: string;
  body: string[];
  chart: TermChart;
  chartCaption: string;
  /** Site pages (paths) and methodology anchors (`/methodology/#id`) to read next. */
  related: { href: string; label: string }[];
}

export const LEARN_TERMS: LearnTerm[] = [
  {
    slug: 'funding',
    term: 'Funding rate',
    summary:
      "The hourly payment between longs and shorts that keeps a perp's price near its oracle price.",
    body: [
      "A perpetual future never expires, so nothing forces its price back to the asset's price elsewhere. Funding does: every hour, one side pays the other a share of their position's value.",
      'On Hyperliquid the rate has two parts. A small interest rate makes longs pay shorts by default: 0.01% per 8 hours on the main exchange, about 11% a year. The premium, how far the perp trades from its oracle price, takes over once it leaves a band around that interest rate: the further above, the more longs pay; far enough below, shorts pay longs.',
      'Payments are made at the top of every hour and are capped at 4% an hour. Builder exchanges set their own interest rate, band and a multiplier that scales the whole rate.',
      'On 2026-10-04, 154 of the 178 live main-exchange perps sat exactly at the base rate of 10.95% a year; across all 330 live perps the rate ran from −469% to +540% a year.',
    ],
    chart: 'funding-histogram',
    chartCaption:
      'Every live perp by its funding rate per year, now: grey at the base rate, blue where the premium sets it.',
    related: [
      { href: '/funding/', label: 'Funding on every perp' },
      { href: '/methodology/#funding', label: 'How the rate is defined' },
    ],
  },
  {
    slug: 'premium',
    term: 'Premium',
    summary: 'How far a perp trades from its oracle price: the input that moves funding.',
    body: [
      'Hyperliquid samples a premium every 5 seconds: how far the prices to buy and to sell a set size (the impact prices) lie from the oracle price, as a share of it. On the main exchange the premium is zero while the oracle lies between the two; builder exchanges measure it from their midpoint.',
      "The hour's average premium sets the funding rate whenever it leaves the band around the interest rate. One sample says little about the hour: on 2026-10-04 the latest sample and the hour's rate disagreed about the band on 50 of 330 perps.",
    ],
    chart: 'premium-history',
    chartCaption:
      "The perp with the most open interest right now: hourly funding (bars) and that hour's premium (line), last 7 days.",
    related: [
      { href: '/funding/', label: 'Premium against the band, every perp' },
      { href: '/methodology/#base-rate', label: 'The band, defined' },
    ],
  },
  {
    slug: 'impact-price',
    term: 'Impact price and impact spread',
    summary:
      'What buying or selling a set size at once costs, published by Hyperliquid for every perp.',
    body: [
      'An impact price is the average price a market order of a set size would fill at against the book: the impact bid for selling, the impact ask for buying. Hyperliquid publishes both for every perp, continuously, and uses them for the premium.',
      'The gap between them, as a share of their midpoint, is the impact spread: what buying and immediately selling that size costs before fees. The size is $20,000 on BTC and ETH and $6,000 on other main-exchange perps; builder exchanges do not publish theirs.',
      'Checked 2026-10-04 against live books: on 22 main-exchange perps the impact prices matched the average fill for $6,000 to within about 1 basis point.',
    ],
    chart: 'market-map',
    chartCaption:
      'Every live perp by 24-hour volume (across) and impact spread (up); bubble area is open interest.',
    related: [
      { href: '/liquidity/', label: 'Impact spread and measured books' },
      { href: '/methodology/#impact-spread', label: 'The impact spread, defined' },
    ],
  },
  {
    slug: 'mark-and-oracle',
    term: 'Mark price and oracle price',
    summary: 'The price a perp trades at on Hyperliquid, and the outside reference it is held to.',
    body: [
      "The oracle price is the reference a perp is held to: funding pulls the perp toward it. On the main exchange Hyperliquid provides it; on a builder exchange the exchange's own oracle updater publishes it (each exchange's page names that address).",
      'The mark price is the price this site shows for each market. The gap between the two, in basis points, shows how far the market sits from its reference right now.',
      'On 2026-10-04 the median gap was 2.7 basis points on xyz and 5.6 on the main exchange.',
    ],
    chart: 'mark-oracle',
    chartCaption:
      'The live perps whose mark sits furthest from the oracle right now, in basis points.',
    related: [
      { href: '/exchanges/compare/', label: 'Exchanges compared' },
      { href: '/methodology/#mark-oracle-gap', label: 'The gap, defined' },
    ],
  },
  {
    slug: 'open-interest',
    term: 'Open interest',
    summary: 'The value of the contracts still open on a perp.',
    body: [
      "Every perp contract has a long and a short. Open interest counts the contracts open on one side (Hyperliquid's figure) times the mark price: the value of the positions still held.",
      "It grows when new positions open and shrinks when they close; a trade that only moves a position from one holder to another leaves it unchanged. Against the day's volume, it shows how much is held compared with how much is traded.",
      'On 2026-10-04 the main exchange held $13.2bn of open interest and the builder exchanges $3.95bn, 97.7% of it on xyz.',
    ],
    chart: 'oi-treemap',
    chartCaption: 'Open interest now: one block per exchange, one tile per live market.',
    related: [
      { href: '/open-interest/', label: 'Open interest, every perp' },
      { href: '/methodology/#open-interest', label: 'How it is counted' },
    ],
  },
  {
    slug: 'open-interest-caps',
    term: 'Open-interest caps',
    summary: 'Limits on how much may be held open in one market, or on one exchange.',
    body: [
      "Each builder exchange caps every market's open interest in dollars, and its total across markets (Hyperliquid's documentation: notional, position size times mark price). The main exchange has caps too but does not publish them; it lists the markets that have reached theirs.",
      'Cap use is open interest against the cap: how close a market is to its limit.',
      'On 2026-10-04 the fullest builder market was io:ANTH, at 85% of its cap; xyz had used 38.6% of its $10bn exchange-wide cap.',
    ],
    chart: 'cap-use',
    chartCaption: 'The builder-exchange markets closest to their cap right now.',
    related: [
      { href: '/open-interest/', label: 'Cap use, every market' },
      { href: '/methodology/#cap-use', label: 'Caps, defined' },
    ],
  },
  {
    slug: 'builder-exchanges',
    term: 'Builder exchanges (HIP-3)',
    summary: 'Perp exchanges that others deploy on Hyperliquid, with their own markets and rules.',
    body: [
      'Since HIP-3, others can deploy their own perp exchanges on Hyperliquid. Each has a deployer address, its own markets, open-interest caps, funding settings and fees, and settles in a token of its choosing.',
      'New listings on any of them are sold by one shared Dutch auction, priced in HYPE.',
      'On 2026-10-04, 10 builder exchanges existed; 4 had live markets, and xyz (trade.xyz) held 97.7% of their open interest.',
    ],
    chart: 'exchange-share',
    chartCaption: 'Open interest of each builder exchange with live markets, now.',
    related: [
      { href: '/exchanges/', label: 'Every exchange' },
      { href: '/exchanges/compare/', label: 'Exchanges compared' },
      { href: '/listings/', label: 'Listings and the listing auction' },
    ],
  },
  {
    slug: 'spot-perp-basis',
    term: 'Spot–perp basis',
    summary: "The gap between an asset's spot price and its perp price.",
    body: [
      'When an asset trades both as a spot pair and as a perp, the two prices can drift apart. The basis is the perp price minus the spot price, as a share of the spot price, in basis points.',
      "Funding ties a perp to its oracle price, not to Hyperliquid's own spot pair, so the two can differ.",
      "Markets count as the same asset when they share a name and their prices are within 2%. On 2026-10-04 that matched 7 spot–perp pairs, HYPE three times (against USDC, USDT0 and USDE); four more shared a name but not an asset (TRUMP spot at $0.0006, the perp at $2.05). A real gap wider than 2% would be read as two assets: CRCL's spot and perp were 2.05% apart that day.",
    ],
    chart: 'spot-perp-basis',
    chartCaption:
      'Every asset on both spot and a perp, now: the perp against the spot price, in basis points.',
    related: [
      { href: '/markets/', label: 'Every market' },
      { href: '/methodology/#same-asset', label: 'Same asset, defined' },
    ],
  },
  {
    slug: 'depth-and-cost',
    term: 'Book depth and cost to trade',
    summary: 'How much is resting near the price, and what a larger order would pay.',
    body: [
      'The order book lists the orders waiting to be filled. Depth is their value within a band around the mid price; cost to trade is how far the average fill of a market order of a given size lands from the mid.',
      'Hyperliquid sends the 20 nearest levels on each side live; further out its books come grouped into price buckets, which give bounds only: depth "at least", cost "at most".',
      'Measured 2026-10-04: a $1M market buy of BTC filled about 0.6 basis points from the mid; of NVDA on xyz, at most 13.5.',
    ],
    chart: 'book',
    chartCaption: 'The perp with the most open interest right now: depth and cost to trade, live.',
    related: [
      { href: '/liquidity/', label: "Measure any market's book" },
      { href: '/methodology/#depth', label: 'Depth, defined' },
      { href: '/methodology/#cost-to-trade', label: 'Cost to trade, defined' },
    ],
  },
  {
    slug: 'lending-rates',
    term: 'Lending rates and utilization',
    summary: "How Hyperliquid's lending market sets what borrowers pay and lenders earn.",
    body: [
      'Hyperliquid has a built-in lending market: stablecoins are supplied and borrowed, and tokens such as HYPE are posted as collateral.',
      "Utilization is the share of a token's supply that is lent out. Borrowers pay 5% a year until 80% is lent out; then the rate climbs steeply, to 100% at full use. Lenders earn what borrowers pay, spread over everything supplied, less the 10% Hyperliquid keeps.",
      'On 2026-10-04 USDC was 74.9% lent out: $532.6M supplied, $399.2M borrowed, lenders earning 3.37% a year.',
    ],
    chart: 'lending-curve',
    chartCaption: 'The documented rate curve, and where each stablecoin sits on it now.',
    related: [
      { href: '/lending/', label: 'The lending market' },
      { href: '/methodology/#lending', label: 'Lending, defined' },
    ],
  },
  {
    slug: 'maker-taker-fees',
    term: 'Maker and taker fees',
    summary: 'What each fill costs, who pays more, and how the rate comes down.',
    body: [
      'Every fill pays a fee. The taker, whose order meets an order already resting in the book, pays the taker rate; the maker, whose resting order was filled, pays the lower maker rate.',
      "At the base tier on 2026-10-05: perps 0.045% taker and 0.015% maker, spot 0.07% and 0.04% (Hyperliquid's live schedule, below). Rates fall with an account's 14-day volume, spot counting double, and the tier is set at the end of each UTC day. The largest makers earn a small rebate instead; staking HYPE takes 5% to 40% off; a referral takes 4% off the first $25M of volume.",
      "On builder exchanges the deployer adds its own share on top: 0–300%, or 0–100% in growth mode, and growth mode cuts all-in fees by at least 90%, to a taker rate of 0.0045%–0.009% (Hyperliquid's fee documentation, read 2026-10-05).",
      "Fees go to HLP, the assistance fund and the exchanges' deployers; the assistance fund turns its share into HYPE and burns it. For a taker, fees are often the larger part of a round trip: twice 0.045% is 9 basis points, many times BTC's impact spread.",
    ],
    chart: 'fee-schedule',
    chartCaption:
      "Hyperliquid's fee schedule as it returns it now, and a taker round trip on the busiest main-exchange perps: the impact spread plus the taker fee twice.",
    related: [
      { href: '/learn/impact-price/', label: 'Impact spread' },
      { href: '/learn/builder-codes/', label: 'Builder codes' },
      { href: '/listings/', label: "Each builder market's fee settings" },
    ],
  },
  {
    slug: 'builder-codes',
    term: 'Builder codes',
    summary: 'How the app you trade through can add its own fee, and how much at most.',
    body: [
      "A builder is an app or front-end that sends orders to Hyperliquid for its users. With a builder code it can charge its own fee on each fill it sends, on top of the exchange's fee.",
      "The user first approves a maximum fee for that builder, signed by their main wallet, not an API wallet. The builder fee can be at most 0.1% on perps and 1% on spot. Builders collect it the way referral rewards are collected, and need at least 100 USDC in their perps account (Hyperliquid's documentation, read 2026-10-05).",
      'So the same trade can cost different amounts depending on the app it is placed through.',
    ],
    chart: 'builder-fee',
    chartCaption:
      "On a $10,000 market order: the exchange's base fee now, and the most a builder may add.",
    related: [{ href: '/learn/maker-taker-fees/', label: 'Maker and taker fees' }],
  },
  {
    slug: 'twap',
    term: 'TWAP orders',
    summary:
      'Buying or selling a set size spread over time, in small pieces, instead of all at once.',
    body: [
      'A TWAP (time-weighted average price) order trades a set size over a set time, in small suborders.',
      "On Hyperliquid a suborder goes out every 30 seconds: $10,000 over an hour becomes about 121 suborders of about $83 (Hyperliquid's own example). Each may slip at most 3%. If one does not fill, later ones are larger to catch up, but at most 3 times the normal size, so the order can end short of its full size. Runs last from 5 minutes to 7 days, from $100; longer runs send suborders less often (documentation, read 2026-10-05).",
      'Each small piece meets only the front of the book, so it costs less than one large order would. The price can move while the order runs, though, so the total cost is not known in advance.',
    ],
    chart: 'twap',
    chartCaption:
      'The perp with the most open interest right now: an hour-long TWAP against one market order, both against the book as it is now.',
    related: [
      { href: '/learn/depth-and-cost/', label: 'Book depth and cost to trade' },
      { href: '/liquidity/', label: "Measure any market's book" },
    ],
  },
];

export const learnPath = (slug: string): string => `/learn/${slug}/`;
