'use client';
/**
 * Book and cost to trade (plan §3.3): the 20 live levels (exact, on the shared
 * per-coin connection) and two grouped books read over REST every few seconds
 * (nSigFigs 4 and 3, weight 2 each: book messages do not say their grouping,
 * so they cannot share the connection). Figures past the live levels are
 * bounds: depth "at least", cost "at most" (lib/book/book-figures.ts).
 */
import { useEffect, useState } from 'react';
import { BOOK_COARSE_N_SIG_FIGS, BOOK_MIDDLE_N_SIG_FIGS, FEED } from '@/lib/hl/constants';
import { L2Book } from '@/lib/hl/types';
import { bookFigures } from '@/lib/book/book-figures';
import { bandLabel, costText, depthText } from '@/lib/book/bound-text';
import { nearBookStats } from '@/lib/book/near-book-stats';
import { usdCompact } from '@/lib/format/format';
import { MarketNotLiveError } from '@/lib/live/live-client';
import { useLiveClient } from '@/lib/live/use-live-client';
import { usePolledInfo } from '@/lib/live/use-polled-info';

/** The grouped books change slowly at their scale; every 5 s costs 2 x 2 weight, ~24 of the tab's 600 a minute. */
const GROUPED_POLL_MS = 5_000;

export function BookPanel({ coin }: { coin: string }) {
  const { client } = useLiveClient();
  const [fine, setFine] = useState<L2Book | null>(null);
  const [note, setNote] = useState('');
  const middle = usePolledInfo<L2Book>(
    client,
    { type: FEED.l2Book, coin, nSigFigs: BOOK_MIDDLE_N_SIG_FIGS },
    GROUPED_POLL_MS,
    false
  );
  const coarse = usePolledInfo<L2Book>(
    client,
    { type: FEED.l2Book, coin, nSigFigs: BOOK_COARSE_N_SIG_FIGS },
    GROUPED_POLL_MS,
    false
  );

  useEffect(() => {
    if (!client) return;
    let off: (() => void) | null = null;
    let stopped = false;
    client
      .start()
      .then(() => {
        if (stopped) return;
        try {
          off = client.subscribeCoin({ type: FEED.l2Book, coin }, (d) => setFine(d as L2Book));
        } catch (e) {
          setNote(
            e instanceof MarketNotLiveError ? 'No live book: the market is not trading.' : String(e)
          );
        }
      })
      .catch((e: unknown) => setNote(String(e)));
    return () => {
      stopped = true;
      off?.();
    };
  }, [client, coin]);

  if (note) return <p style={{ color: 'var(--muted-foreground)' }}>{note}</p>;
  if (!fine) return <p style={{ color: 'var(--muted-foreground)' }}>Waiting for the book…</p>;
  const near = nearBookStats(fine);
  const figures = bookFigures(fine, middle.data, coarse.data);
  if (!near || !figures)
    return <p style={{ color: 'var(--muted-foreground)' }}>The book is empty on one side.</p>;
  const td = {
    padding: '0.2rem 0.7rem',
    textAlign: 'right' as const,
    fontVariantNumeric: 'tabular-nums' as const,
  };
  const th = { ...td, borderBottom: '1px solid var(--border)' };

  return (
    <section>
      <p>
        Spread {near.spreadBps.toFixed(2)} bp · of the value resting in the 20 live levels, bids
        hold {(((1 + near.imbalance) / 2) * 100).toFixed(0)}% and asks{' '}
        {(((1 - near.imbalance) / 2) * 100).toFixed(0)}% · {near.ordersPerLevel.toFixed(1)} orders
        per level. The 20 live levels reach {near.spanBps.bid.toFixed(1)} bp below and{' '}
        {near.spanBps.ask.toFixed(1)} bp above the mid.
      </p>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '2rem' }}>
        <table style={{ borderCollapse: 'collapse', fontSize: '0.9em' }}>
          <caption style={{ textAlign: 'left', fontWeight: 600 }}>Resting orders within</caption>
          <thead>
            <tr>
              <th style={{ ...th, textAlign: 'left' }}>of the mid</th>
              <th style={th}>Bids</th>
              <th style={th}>Asks</th>
            </tr>
          </thead>
          <tbody>
            {figures.depth.map((d) => (
              <tr key={d.band}>
                <td style={{ ...td, textAlign: 'left' }}>{bandLabel(d.band)}</td>
                <td style={td}>{depthText(d.bid)}</td>
                <td style={td}>{depthText(d.ask)}</td>
              </tr>
            ))}
          </tbody>
        </table>
        <table style={{ borderCollapse: 'collapse', fontSize: '0.9em' }}>
          <caption style={{ textAlign: 'left', fontWeight: 600 }}>
            Cost of one market order, against the mid
          </caption>
          <thead>
            <tr>
              <th style={{ ...th, textAlign: 'left' }}>Size</th>
              <th style={th}>Buy</th>
              <th style={th}>Sell</th>
            </tr>
          </thead>
          <tbody>
            {figures.cost.map((c) => (
              <tr key={c.usd}>
                <td style={{ ...td, textAlign: 'left' }}>{usdCompact(c.usd)}</td>
                <td style={td}>{costText(c.buy)}</td>
                <td style={td}>{costText(c.sell)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p style={{ fontSize: '0.8em', color: 'var(--muted-foreground)', maxWidth: '50rem' }}>
        Exact within the 20 live levels. Further out the figures come from Hyperliquid&apos;s
        grouped books, read so they can only understate depth and overstate cost: hence &quot;at
        least&quot; and &quot;at most&quot;. &quot;Not measured&quot; means no book reaches that
        far; it is never a zero. Fees are not included.
        {middle.error || coarse.error
          ? ` Grouped books: ${middle.error || coarse.error}.`
          : ''}{' '}
        Source: Hyperliquid <code>l2Book</code> (live, and grouped at 4 and 3 significant figures).
      </p>
    </section>
  );
}
