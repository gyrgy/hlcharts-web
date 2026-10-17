/**
 * One market's book, measured once for `/liquidity` (plan §3.3): the live 20
 * levels and the two grouped books the market pages use (REST l2Book, weight
 * 2 each), turned into the same figures (lib/book/book-figures.ts). Without
 * the fine book there is nothing to measure, so its failure is thrown; a
 * grouped book that fails only narrows how far the figures reach.
 */
import { BookFigures, bookFigures } from '../book/book-figures';
import { nearBookStats } from '../book/near-book-stats';
import { BOOK_COARSE_N_SIG_FIGS, BOOK_MIDDLE_N_SIG_FIGS, FEED } from '../hl/constants';
import { L2Book } from '../hl/types';

/** Three l2Book requests at 2 weight each. */
export const MEASURE_WEIGHT_PER_MARKET = 6;

export interface MeasuredBook {
  at: number;
  /** Best bid to best ask, bp of the mid. */
  spreadBps: number | null;
  figures: BookFigures | null;
}

export async function measureBook(
  request: <T>(body: Record<string, unknown>) => Promise<T>,
  coin: string,
  now: () => number = Date.now
): Promise<MeasuredBook> {
  const fine = await request<L2Book>({ type: FEED.l2Book, coin });
  const grouped = async (nSigFigs: number): Promise<L2Book | null> =>
    request<L2Book>({ type: FEED.l2Book, coin, nSigFigs }).catch(() => null);
  const middle = await grouped(BOOK_MIDDLE_N_SIG_FIGS);
  const coarse = await grouped(BOOK_COARSE_N_SIG_FIGS);
  return {
    at: now(),
    spreadBps: nearBookStats(fine)?.spreadBps ?? null,
    figures: bookFigures(fine, middle, coarse),
  };
}
