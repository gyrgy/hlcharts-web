'use client';
/**
 * The same asset on other venues (plan §3.3), side by side: price gap against
 * this market, spread and depth within ±50 bp from each sibling's live levels
 * (REST l2Book, weight 2, every 30 s), funding and open interest. Also names
 * markets that share the name but not the price: a different asset.
 */
import Link from 'next/link';
import { FEED, INFO } from '@/lib/hl/constants';
import { L2Book, SpotMetaAndAssetCtxs } from '@/lib/hl/types';
import { bookLadder } from '@/lib/book/book-ladder';
import { depthWithin } from '@/lib/book/depth-within';
import { nearBookStats } from '@/lib/book/near-book-stats';
import { MISSING, pctSigned, price, usdCompact } from '@/lib/format/format';
import { LiveClient } from '@/lib/live/live-client';
import { useLiveClient } from '@/lib/live/use-live-client';
import { usePolledInfo } from '@/lib/live/use-polled-info';
import { buildPerpRows } from '@/lib/markets/build-perp-rows';
import { buildSpotRows } from '@/lib/markets/build-spot-rows';
import { isNameOnly, isSibling, siblingVenue } from '@/lib/markets/sibling-rules';
import { MarketRow } from '@/lib/markets/types';
import { tableBox } from './table-box';

const SPOT_POLL_MS = 5 * 60_000;
const SIBLING_BOOK_POLL_MS = 30_000;
const DEPTH_BAND = 0.005;

const td = {
  padding: '0.2rem 0.7rem',
  textAlign: 'right' as const,
  fontVariantNumeric: 'tabular-nums' as const,
};

function SiblingRow({
  client,
  row,
  target,
}: {
  client: LiveClient;
  row: MarketRow;
  target: MarketRow;
}) {
  const book = usePolledInfo<L2Book>(
    client,
    { type: FEED.l2Book, coin: row.key },
    SIBLING_BOOK_POLL_MS,
    false
  );
  const stats = book.data ? nearBookStats(book.data) : null;
  const ladder = book.data ? bookLadder(book.data, []) : null;
  const depth = (side: 'bid' | 'ask'): string => {
    if (!ladder || !stats) return MISSING;
    const d = depthWithin(ladder, side, DEPTH_BAND);
    const span = side === 'bid' ? stats.spanBps.bid : stats.spanBps.ask;
    return d ? usdCompact(d.usd) : `book reaches ${span.toFixed(0)} bp`;
  };
  return (
    <tr>
      <td style={{ ...td, textAlign: 'left' }}>
        <Link href={row.href}>
          {row.name} · {siblingVenue(row)}
        </Link>
      </td>
      <td style={td}>{price(row.markPx)}</td>
      <td style={td}>{(((row.markPx - target.markPx) / target.markPx) * 10_000).toFixed(1)} bp</td>
      <td style={td}>{stats ? `${stats.spreadBps.toFixed(1)} bp` : MISSING}</td>
      <td style={td}>{depth('bid')}</td>
      <td style={td}>{depth('ask')}</td>
      <td style={td}>
        {row.fundingHourly === null ? 'spot' : `${pctSigned(row.fundingHourly, 4)}/h`}
      </td>
      <td style={td}>{usdCompact(row.oiUsd)}</td>
    </tr>
  );
}

export function SiblingsPanel({ coin }: { coin: string }) {
  const { client } = useLiveClient();
  const spot = usePolledInfo<SpotMetaAndAssetCtxs>(
    client,
    { type: INFO.spotMetaAndAssetCtxs },
    SPOT_POLL_MS
  );
  if (!client) return null;
  const tick = (c: string) => client.store.tick(c);
  const rows = [
    ...buildPerpRows(client.store.perps(), tick, client.universe.dexes, new Set()),
    ...(spot.data ? buildSpotRows(spot.data, tick) : []),
  ];
  const target = rows.find((r) => r.key === coin);
  if (!target) return <p style={{ color: 'var(--muted-foreground)' }}>Waiting for live data…</p>;
  const siblings = rows.filter((r) => isSibling(target, r));
  const nameOnly = rows.filter((r) => isNameOnly(target, r));
  const th = { ...td, borderBottom: '1px solid var(--border)' };
  return (
    <section>
      {siblings.length ? (
        <div {...tableBox()}>
          <table style={{ borderCollapse: 'collapse', fontSize: '0.9em' }}>
            <thead>
              <tr>
                {[
                  'Market',
                  'Price',
                  'Gap vs this',
                  'Spread',
                  'Bids ±0.5%',
                  'Asks ±0.5%',
                  'Funding',
                  'Open interest',
                ].map((h, i) => (
                  <th key={h} style={{ ...th, textAlign: i === 0 ? 'left' : 'right' }}>
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {siblings.map((s) => (
                <SiblingRow key={s.key} client={client} row={s} target={target} />
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <p>No other venue lists this asset at a price within 2% of this one.</p>
      )}
      {nameOnly.length > 0 && (
        <p style={{ color: 'var(--muted-foreground)' }}>
          Same name, different asset (price more than 2% apart):{' '}
          {nameOnly.map((r, i) => (
            <span key={r.key}>
              {i > 0 ? ', ' : ''}
              <Link href={r.href}>
                {r.name} · {siblingVenue(r)}
              </Link>{' '}
              at {price(r.markPx)}
            </span>
          ))}
          .
        </p>
      )}
      <p style={{ fontSize: '0.8em', color: 'var(--muted-foreground)', maxWidth: '50rem' }}>
        Matched by name and a price within 2%; different names (UBTC on spot, BTC perp) are not
        matched. Depth from each market&apos;s 20 live levels, refreshed every 30 s; where they stop
        short of ±0.5%, the reach is shown instead.
      </p>
    </section>
  );
}
