/**
 * Hourly funding from `startTime` to now. Hyperliquid returns at most 500
 * rows per request, and the FIRST 500 after startTime (asking for 60 days gave
 * Aug 5-26, 2026-10-04), so longer ranges page forward from the start until a
 * page comes back short. Each page goes through the tab's weight queue; the
 * caller hears progress, so a long range never looks frozen.
 */
import { INFO } from '../hl/constants';
import { FundingRow } from '../hl/types';

export const FUNDING_PAGE_ROWS = 500;
const MAX_PAGES = 30;

export async function fetchFundingHistory(
  request: <T>(body: Record<string, unknown>) => Promise<T>,
  coin: string,
  startTime: number,
  endTime: number,
  onProgress?: (rows: number) => void
): Promise<FundingRow[]> {
  const rows: FundingRow[] = [];
  let from = startTime;
  for (let page = 0; page < MAX_PAGES; page++) {
    const got = await request<FundingRow[]>({
      type: INFO.fundingHistory,
      coin,
      startTime: from,
      endTime,
    });
    rows.push(...got);
    onProgress?.(rows.length);
    if (got.length < FUNDING_PAGE_ROWS) return rows;
    const next = got[got.length - 1].time + 1;
    if (next <= from) throw new Error(`fundingHistory for ${coin} did not advance past ${from}`);
    from = next;
  }
  throw new Error(`fundingHistory for ${coin}: more than ${MAX_PAGES} pages`);
}
