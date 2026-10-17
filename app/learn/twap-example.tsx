'use client';
/**
 * TWAP, live: an hour-long TWAP buy on the busiest perp, split as Hyperliquid
 * splits it, with one suborder's cost against the book now next to one
 * market order for the whole size. A snapshot: over the hour the book refills
 * and the price moves, which no single read of the book can show.
 */
import { useState } from 'react';
import { costText } from '@/lib/book/bound-text';
import { costAt } from '@/lib/book/book-figures';
import { pct, usdCompact } from '@/lib/format/format';
import { BOOK_COARSE_N_SIG_FIGS, BOOK_MIDDLE_N_SIG_FIGS, FEED } from '@/lib/hl/constants';
import { L2Book } from '@/lib/hl/types';
import {
  TWAP_CATCH_UP_LIMIT,
  TWAP_MAX_PLANNED_S,
  TWAP_MAX_SLIPPAGE,
  twapPlan,
} from '@/lib/learn/twap-plan';
import { LiveClient } from '@/lib/live/live-client';
import { usePolledInfo } from '@/lib/live/use-polled-info';

const SIZES = [100_000, 1_000_000, 10_000_000];
/** Three REST books (6 weight) every 10 s: 36 of the tab's ~600 a minute. */
const BOOK_POLL_MS = 10_000;

export function TwapExample({
  client,
  coin,
  label,
}: {
  client: LiveClient;
  coin: string;
  label: string;
}) {
  const [size, setSize] = useState(SIZES[1]);
  const fine = usePolledInfo<L2Book>(client, { type: FEED.l2Book, coin }, BOOK_POLL_MS, false);
  const middle = usePolledInfo<L2Book>(
    client,
    { type: FEED.l2Book, coin, nSigFigs: BOOK_MIDDLE_N_SIG_FIGS },
    BOOK_POLL_MS,
    false
  );
  const coarse = usePolledInfo<L2Book>(
    client,
    { type: FEED.l2Book, coin, nSigFigs: BOOK_COARSE_N_SIG_FIGS },
    BOOK_POLL_MS,
    false
  );
  const plan = twapPlan(size, TWAP_MAX_PLANNED_S);
  if (!fine.data)
    return <p style={{ color: 'var(--muted-foreground)' }}>{fine.error || 'Reading the book…'}</p>;
  const one = costAt(fine.data, middle.data, coarse.data, 'buy', plan.suborderUsd);
  const all = costAt(fine.data, middle.data, coarse.data, 'buy', size);
  return (
    <div style={{ maxWidth: '46rem' }}>
      <p style={{ margin: '0 0 0.4rem' }}>
        Buying{' '}
        <select value={size} onChange={(e) => setSize(Number(e.target.value))}>
          {SIZES.map((s) => (
            <option key={s} value={s}>
              {usdCompact(s)}
            </option>
          ))}
        </select>{' '}
        of {label} over one hour.
      </p>
      <table style={{ borderCollapse: 'collapse', fontSize: '0.9em' }}>
        <tbody>
          <tr>
            <td style={{ padding: '0.15rem 0.8rem 0.15rem 0' }}>As a TWAP</td>
            <td>
              {plan.suborders} suborders of {usdCompact(plan.suborderUsd)}, one every{' '}
              {plan.intervalS} s; each, against the book now: <b>{costText(one)}</b> from the mid
            </td>
          </tr>
          <tr>
            <td style={{ padding: '0.15rem 0.8rem 0.15rem 0' }}>As one market order</td>
            <td>
              against the book now: <b>{costText(all)}</b> from the mid
            </td>
          </tr>
        </tbody>
      </table>
      <p style={{ fontSize: '0.8em', color: 'var(--muted-foreground)' }}>
        Each suborder may slip at most {pct(TWAP_MAX_SLIPPAGE, 0)}; a missed fill is made up later,
        by suborders up to {TWAP_CATCH_UP_LIMIT} times the normal size. This compares both against
        the book as it is now: over an hour the book refills and the price moves, which one read of
        the book cannot show, so the TWAP&apos;s real cost is not known in advance.
      </p>
    </div>
  );
}
