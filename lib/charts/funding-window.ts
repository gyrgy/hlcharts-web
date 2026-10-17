/**
 * The next piece of a market's funding history to fetch, newest first. A piece
 * spans at most FUNDING_WINDOW_MS of hourly rows, under fundingHistory's
 * 500-row cap, so one request returns all of it. Newest first, a chart draws
 * the recent weeks at once and extends to the left as older pieces arrive, and
 * a shorter range picked later is already loaded. (Paging forward from the
 * start, as fetch-funding-history.ts does for one market, delivers the recent
 * weeks last: three markets × 90 days spent a minute of the tab's request
 * budget before anything was drawn, and every later pick queued behind it.)
 */
const HOUR_MS = 3_600_000;
/** 480 hours: under the 500-row cap, with room for a stray extra stamp. */
export const FUNDING_WINDOW_MS = 480 * HOUR_MS;

export interface FundingWindow {
  startTime: number;
  endTime: number;
}

/**
 * `from`: the oldest time already covered; null when nothing is loaded yet,
 * 0 when the market has nothing older (it was listed later). `since`: the
 * oldest time the chart wants. Null when nothing more is needed.
 */
export function nextFundingWindow(
  from: number | null,
  since: number,
  now: number
): FundingWindow | null {
  if (from === null) return { startTime: Math.max(since, now - FUNDING_WINDOW_MS), endTime: now };
  if (from <= since) return null;
  return { startTime: Math.max(since, from - FUNDING_WINDOW_MS), endTime: from - 1 };
}
