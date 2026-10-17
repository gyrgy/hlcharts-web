/**
 * Every chart's stable id (plan §3.2): the name embeds, posts and file names
 * use, so it never changes once published. Each id names its data source and
 * the methodology section that defines it, so the source line and the link
 * under a chart can never disagree with the chart.
 */
export const CHART_ID = {
  marketPrice: 'market.price',
  marketFunding: 'market.funding',
  fundingCompare: 'funding.compare',
  fundingHistogram: 'funding.histogram',
  marketsMap: 'markets.map',
  oiTreemap: 'oi.treemap',
  lendingCurve: 'lending.curve',
} as const;
export type ChartId = (typeof CHART_ID)[keyof typeof CHART_ID];

export interface ChartSpec {
  /** Hyperliquid's request or feed, as named in the source line. */
  source: string;
  /** The methodology anchor that defines the figure. */
  methodology: string;
  /** The iframe height the embed code suggests, in pixels: the chart, its controls and the credit. */
  embedHeight: number;
  /** The page an embed credits: fixed for the overview charts; a market chart credits its market's page. */
  page?: string;
}

export const CHART_SPECS: Record<ChartId, ChartSpec> = {
  'market.price': {
    source: 'candleSnapshot, then the candle feed',
    methodology: 'price',
    embedHeight: 520,
  },
  'market.funding': { source: 'fundingHistory', methodology: 'funding-history', embedHeight: 420 },
  'funding.compare': {
    source: 'fundingHistory',
    methodology: 'funding-history',
    embedHeight: 640,
    page: '/funding/',
  },
  'funding.histogram': {
    source: 'allDexsAssetCtxs',
    methodology: 'funding',
    embedHeight: 400,
    page: '/funding/',
  },
  'markets.map': {
    source: 'allDexsAssetCtxs',
    methodology: 'impact-spread',
    embedHeight: 620,
    page: '/',
  },
  'oi.treemap': {
    source: 'allDexsAssetCtxs',
    methodology: 'open-interest',
    embedHeight: 660,
    page: '/open-interest/',
  },
  'lending.curve': {
    source: 'allBorrowLendReserveStates',
    methodology: 'lending',
    embedHeight: 440,
    page: '/lending/',
  },
};
