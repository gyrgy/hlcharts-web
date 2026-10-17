/**
 * Funding history loads newest first, in pieces one request can hold, and a
 * range already loaded costs nothing. Written after three markets × 90 days,
 * paged oldest first, held every later pick behind a minute of requests.
 */
import { describe, expect, it } from 'vitest';
import { FundingRow } from '../../hl/types';
import { fetchFundingWindow } from '../fetch-funding-window';
import { FUNDING_WINDOW_MS, nextFundingWindow } from '../funding-window';

const DAY = 86_400_000;
const NOW = Date.UTC(2026, 9, 15, 12, 10);

/** Every piece the loader would ask for, newest first, until `since` is covered. */
function plan(since: number, from: number | null = null) {
  const pieces = [];
  for (let w = nextFundingWindow(from, since, NOW); w; ) {
    pieces.push(w);
    from = w.startTime;
    w = nextFundingWindow(from, since, NOW);
  }
  return pieces;
}

describe('nextFundingWindow', () => {
  it('fetches a short range in one piece ending now', () => {
    expect(plan(NOW - 7 * DAY)).toEqual([{ startTime: NOW - 7 * DAY, endTime: NOW }]);
  });

  it('fetches a long range newest first, in pieces that meet without overlap', () => {
    const pieces = plan(NOW - 90 * DAY);
    expect(pieces).toHaveLength(5);
    expect(pieces[0]).toEqual({ startTime: NOW - FUNDING_WINDOW_MS, endTime: NOW });
    for (let i = 1; i < pieces.length; i++) {
      expect(pieces[i].endTime).toBe(pieces[i - 1].startTime - 1);
      expect(pieces[i].startTime).toBeLessThan(pieces[i].endTime);
    }
    expect(pieces.at(-1)?.startTime).toBe(NOW - 90 * DAY);
    for (const p of pieces) expect(p.endTime - p.startTime).toBeLessThanOrEqual(FUNDING_WINDOW_MS);
  });

  it('extends a loaded range backwards only by what is missing', () => {
    const sevenDays = plan(NOW - 7 * DAY);
    const more = plan(NOW - 21 * DAY, sevenDays[0].startTime);
    expect(more).toEqual([{ startTime: NOW - 21 * DAY, endTime: NOW - 7 * DAY - 1 }]);
  });

  it('asks for nothing once the range is covered, or when nothing older exists', () => {
    expect(nextFundingWindow(NOW - 90 * DAY, NOW - 21 * DAY, NOW)).toBeNull();
    expect(nextFundingWindow(0, NOW - 90 * DAY, NOW)).toBeNull();
  });
});

describe('fetchFundingWindow', () => {
  const row = (time: number): FundingRow => ({
    coin: 'BTC',
    fundingRate: '0.0000125',
    premium: '0',
    time,
  });

  it('returns one request for the piece', async () => {
    const asked: Record<string, unknown>[] = [];
    const rows = await fetchFundingWindow(
      async <T>(body: Record<string, unknown>) => {
        asked.push(body);
        return [row(1), row(2)] as T;
      },
      'BTC',
      { startTime: 0, endTime: 10 }
    );
    expect(rows).toHaveLength(2);
    expect(asked).toEqual([{ type: 'fundingHistory', coin: 'BTC', startTime: 0, endTime: 10 }]);
  });

  it('fails on a full page instead of leaving a gap', async () => {
    const full = Array.from({ length: 500 }, (_, i) => row(i));
    await expect(
      fetchFundingWindow(async <T>() => full as T, 'BTC', { startTime: 0, endTime: 10 })
    ).rejects.toThrow(/500 rows in one/);
  });
});
