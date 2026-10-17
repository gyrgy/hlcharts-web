/**
 * The site's own pages (everything but the per-market and per-exchange
 * pages), in one list: the header's navigation, the sitemap, llms.txt and the
 * 404 page's address check all read it.
 */
export interface SitePage {
  path: string;
  /** The header link's text; absent for pages not in the header. */
  nav?: string;
  /** Other address prefixes whose pages belong to this header link (it shows as current there). */
  navAlso?: string[];
  title: string;
  summary: string;
}

export const SITE_PAGES: SitePage[] = [
  {
    path: '/',
    title: 'Home',
    summary:
      'Hyperliquid live: totals per exchange, the market map, funding against Binance and Bybit, open-interest caps, lending and the busiest markets.',
  },
  {
    path: '/markets/',
    nav: 'Markets',
    navAlso: ['/perps/', '/spot/'],
    title: 'All markets',
    summary: 'Every perp on the main and builder exchanges and every spot pair, in one table.',
  },
  {
    path: '/funding/',
    nav: 'Funding',
    title: 'Funding',
    summary:
      "Every perp's funding rate, what sets it this hour, Binance and Bybit side by side, and history for up to 10 markets.",
  },
  {
    path: '/open-interest/',
    nav: 'Open interest',
    title: 'Open interest',
    summary: "Open interest by exchange and market, against volume and against each market's cap.",
  },
  {
    path: '/liquidity/',
    nav: 'Liquidity',
    title: 'Liquidity',
    summary:
      'Impact spread for every perp, and order-book depth and cost to trade measured on request.',
  },
  {
    path: '/lending/',
    nav: 'Lending',
    title: 'Lending',
    summary:
      "Hyperliquid's lending market: supplied, borrowed, the share lent out and how the rates are set.",
  },
  {
    path: '/listings/',
    nav: 'Listings',
    title: 'Listings',
    summary:
      'Every perp on every exchange with leverage, margin and fee settings, and the listing auction.',
  },
  {
    path: '/exchanges/',
    nav: 'Exchanges',
    title: 'Exchanges',
    summary:
      'The main exchange and every builder exchange: size, caps, who runs it, one page each.',
  },
  {
    path: '/exchanges/compare/',
    title: 'Exchanges compared',
    summary:
      'The exchanges with live markets side by side, and the assets listed on several of them.',
  },
  {
    path: '/learn/',
    nav: 'Learn',
    title: 'Learn',
    summary: 'The terms behind Hyperliquid data in plain words, each with a live chart.',
  },
  {
    path: '/methodology/',
    nav: 'Methodology',
    title: 'Methodology',
    summary: 'How every number on the site is defined, where it comes from, and what can mislead.',
  },
  {
    path: '/about/',
    title: 'About',
    summary: 'What hlcharts is, where its data comes from, and how to reach it.',
  },
  {
    path: '/legal/',
    title: 'Legal and privacy',
    summary:
      'Not investment advice, no affiliation, the privacy statement and the licence for charts.',
  },
];
