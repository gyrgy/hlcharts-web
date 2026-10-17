import { INFO } from '../hl/constants';
import { FundingRow } from '../hl/types';
import { FUNDING_PAGE_ROWS } from './fetch-funding-history';
import { FundingWindow } from './funding-window';

/**
 * One piece of a market's funding history (funding-window.ts), oldest row
 * first. A full page means the piece did not fit in one request (Hyperliquid
 * paying funding more often than hourly, say): that fails loudly rather than
 * leaving a silent gap in the chart.
 */
export async function fetchFundingWindow(
  request: <T>(body: Record<string, unknown>) => Promise<T>,
  coin: string,
  w: FundingWindow
): Promise<FundingRow[]> {
  const rows = await request<FundingRow[]>({
    type: INFO.fundingHistory,
    coin,
    startTime: w.startTime,
    endTime: w.endTime,
  });
  if (rows.length >= FUNDING_PAGE_ROWS)
    throw new Error(
      `fundingHistory for ${coin}: ${rows.length} rows in one ${Math.round((w.endTime - w.startTime) / 3_600_000)}-hour piece, more than one request returns`
    );
  return rows;
}
