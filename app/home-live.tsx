'use client';
/**
 * The home page's live widgets (plan §3.3): the venue strip, the market map, funding gaps to
 * Binance and Bybit, funding extremes, open-interest cap pressure, builder
 * exchanges' mark against oracle, and the busiest markets.
 */
import Link from 'next/link';
import type { ReactNode } from 'react';
import { INFO, MAIN_DEX, USDC_TOKEN_ID } from '@/lib/hl/constants';
import { AllBorrowLendReserveStates } from '@/lib/hl/types';
import { MISSING, pct, pctSigned, price, usdCompact } from '@/lib/format/format';
import { lendingRows } from '@/lib/lending/lending-rows';
import { usePolledInfo } from '@/lib/live/use-polled-info';
import { venueSummary } from '@/lib/home/venue-summary';
import { SPOT_VENUE } from '@/lib/markets/build-spot-rows';
import { siblingVenue } from '@/lib/markets/sibling-rules';
import { sortRows } from '@/lib/markets/sort-rows';
import { MarketRow } from '@/lib/markets/types';
import { useMarketRows } from '@/lib/markets/use-market-rows';
import { NEAR_CAP } from '@/lib/oi/near-cap';
import { MarketMap } from './components/market-map';
import { tableBox } from './components/table-box';

/** The lending tile: every 5 min on the home page (plan §3.2). */
const LENDING_POLL_MS = 5 * 60_000;
const yearly = (h: number | null): string => (h === null ? MISSING : pctSigned(h * 24 * 365, 1));

function Card({ title, note, children }: { title: string; note: string; children: ReactNode }) {
  return (
    <section
      style={{ border: '1px solid var(--border)', borderRadius: 6, padding: '0.6rem 0.9rem' }}
    >
      <h2 style={{ fontSize: '1.05em', margin: '0 0 0.4rem' }}>{title}</h2>
      {children}
      <p style={{ fontSize: '0.75em', color: 'var(--muted-foreground)', margin: '0.4rem 0 0' }}>
        {note}
      </p>
    </section>
  );
}

function List({ rows, value }: { rows: MarketRow[]; value: (r: MarketRow) => string }) {
  if (!rows.length) return <p style={{ color: 'var(--muted-foreground)' }}>None right now.</p>;
  return (
    <table style={{ borderCollapse: 'collapse', fontSize: '0.9em', width: '100%' }}>
      <tbody>
        {rows.map((r) => (
          <tr key={r.key}>
            <td style={{ padding: '0.1rem 0' }}>
              <Link href={r.href}>{r.name}</Link>{' '}
              <span style={{ fontSize: '0.75em', color: 'var(--muted-foreground)' }}>
                {siblingVenue(r)}
              </span>
            </td>
            <td
              style={{
                padding: '0.1rem 0',
                textAlign: 'right',
                fontVariantNumeric: 'tabular-nums',
              }}
            >
              {value(r)}
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

export function HomeLive() {
  const { client, rows, ready, startError, spotError } = useMarketRows();
  const lending = usePolledInfo<AllBorrowLendReserveStates>(
    client,
    { type: INFO.allBorrowLendReserveStates },
    LENDING_POLL_MS
  );
  if (!client) return null;
  if (startError)
    return <p style={{ color: 'var(--destructive)' }}>Could not reach Hyperliquid: {startError}</p>;
  if (!ready)
    return (
      <p style={{ color: 'var(--muted-foreground)' }}>Waiting for Hyperliquid&apos;s live data…</p>
    );

  const perps = rows.filter((r) => r.kind === 'perp' && !r.delisted);
  const venues = venueSummary(rows);
  const gaps = perps
    .filter((r) => r.cexGapHourly !== null)
    .sort((a, b) => Math.abs(b.cexGapHourly ?? 0) - Math.abs(a.cexGapHourly ?? 0));
  const byFunding = sortRows(perps, 'fundingHourly', true);
  const pressure = sortRows(
    perps.filter((r) => r.atCap || (r.venue !== MAIN_DEX && (r.capUse ?? 0) >= NEAR_CAP)),
    'capUse',
    true
  );
  const usdc = lending.data
    ? lendingRows(lending.data, client.universe.tokenNames).find((r) => r.token === USDC_TOKEN_ID)
    : undefined;
  const builderGaps = perps
    .filter((r) => r.venue !== MAIN_DEX && r.basisBps !== null)
    .sort((a, b) => Math.abs(b.basisBps ?? 0) - Math.abs(a.basisBps ?? 0));
  const busiest = sortRows(
    rows.filter((r) => !r.delisted),
    'volume24h',
    true
  ).slice(0, 25);

  return (
    <>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.8rem', margin: '1rem 0' }}>
        {venues.map((v) => (
          <div
            key={v.venue}
            style={{
              border: '1px solid var(--border)',
              borderRadius: 6,
              padding: '0.5rem 0.8rem',
              minWidth: '10rem',
            }}
          >
            <div style={{ fontWeight: 600 }}>{v.label}</div>
            <div style={{ fontSize: '0.85em', fontVariantNumeric: 'tabular-nums' }}>
              {v.oiUsd !== null && (
                <>
                  Open interest {usdCompact(v.oiUsd)}
                  <br />
                </>
              )}
              Volume 24 h {usdCompact(v.volume24h)}
              <br />
              {v.live} {v.venue === SPOT_VENUE ? 'pairs traded in 24 h' : 'live markets'}
            </div>
          </div>
        ))}
      </div>
      {spotError && <p style={{ color: 'var(--warning)' }}>Spot data: {spotError}</p>}
      <p style={{ fontSize: '0.75em', color: 'var(--muted-foreground)', marginTop: 0 }}>
        Open interest: contracts × mark price, summed over a venue&apos;s live markets. Volume:
        traded value over the last 24 hours; for spot, pairs quoted in USDC only (nearly all of it).{' '}
        <Link href="/methodology/#venue-totals">How these are counted</Link>.
      </p>
      <h2>Market map</h2>
      <MarketMap rows={perps} venues={client.universe.liveDexes()} />
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fill, minmax(19rem, 1fr))',
          gap: '0.9rem',
        }}
      >
        <Card
          title="Funding against Binance and Bybit"
          note="Hyperliquid's funding minus the average of Binance's and Bybit's predicted funding, per year; their 4- or 8-hour rates are put on an hourly basis first. Main exchange."
        >
          <List rows={gaps.slice(0, 10)} value={(r) => yearly(r.cexGapHourly)} />
        </Card>
        <Card
          title="Highest funding"
          note="Per year (hourly rate × 24 × 365), all perps, builder exchanges included."
        >
          <List rows={byFunding.slice(0, 7)} value={(r) => yearly(r.fundingHourly)} />
        </Card>
        <Card title="Lowest funding" note="Negative: shorts pay longs.">
          <List rows={byFunding.slice(-7).reverse()} value={(r) => yearly(r.fundingHourly)} />
        </Card>
        <Card
          title="Open-interest caps"
          note={`Main exchange: markets Hyperliquid lists at their cap. Builder exchanges: open interest at ${pct(NEAR_CAP, 0)} or more of the market's cap.`}
        >
          <List rows={pressure.slice(0, 10)} value={(r) => (r.atCap ? 'at cap' : pct(r.capUse))} />
        </Card>
        <Card
          title="Builder exchanges: mark against oracle"
          note="The largest gaps between a builder-exchange market's mark price and its oracle price right now, in basis points."
        >
          <List
            rows={builderGaps.slice(0, 10)}
            value={(r) => `${(r.basisBps ?? 0).toFixed(1)} bp`}
          />
        </Card>
        <Card
          title="Lending: USDC"
          note="Hyperliquid's built-in lending market. Rates per year; lent out = borrowed ÷ supplied. Refreshed every 5 minutes."
        >
          {usdc ? (
            <p style={{ margin: 0, fontVariantNumeric: 'tabular-nums' }}>
              Supply rate {pct(usdc.supplyRate, 2)} · borrow rate {pct(usdc.borrowRate, 2)}
              <br />
              {pct(usdc.utilization, 1)} lent out of {usdCompact(usdc.suppliedUsd)} supplied
              <br />
              <Link href="/lending/">All lending →</Link>
            </p>
          ) : (
            <p style={{ color: 'var(--muted-foreground)', margin: 0 }}>
              {lending.error ? `Could not load: ${lending.error}` : 'Loading…'}
            </p>
          )}
        </Card>
      </div>
      <h2>Busiest markets</h2>
      <div {...tableBox()}>
        <table style={{ borderCollapse: 'collapse', fontSize: '0.9em' }}>
          <thead>
            <tr>
              {['Market', 'Price', '24 h', 'Volume 24 h', 'Open interest'].map((h, i) => (
                <th
                  key={h}
                  style={{
                    padding: '0.2rem 0.7rem',
                    textAlign: i === 0 ? 'left' : 'right',
                    borderBottom: '1px solid var(--border)',
                  }}
                >
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {busiest.map((r) => (
              <tr key={r.key}>
                <td style={{ padding: '0.15rem 0.7rem' }}>
                  <Link href={r.href}>{r.name}</Link>{' '}
                  <span style={{ fontSize: '0.75em', color: 'var(--muted-foreground)' }}>
                    {siblingVenue(r)}
                  </span>
                </td>
                {[
                  price(r.markPx),
                  pctSigned(r.change24h),
                  usdCompact(r.volume24h),
                  usdCompact(r.oiUsd),
                ].map((v, i) => (
                  <td
                    key={i}
                    style={{
                      padding: '0.15rem 0.7rem',
                      textAlign: 'right',
                      fontVariantNumeric: 'tabular-nums',
                    }}
                  >
                    {v}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p style={{ fontSize: '0.85em' }}>
        Sorted by 24-hour volume. <Link href="/markets/">All markets →</Link>
      </p>
    </>
  );
}
