'use client';
/**
 * `/lending`, live (plan §3.3): the board of every token in the lending reply,
 * the stablecoin and collateral totals, and the rates explained from the
 * documented formula for each stablecoin whose live rates follow it.
 */
import { INFO } from '@/lib/hl/constants';
import { AllBorrowLendReserveStates } from '@/lib/hl/types';
import { amountCompact, MISSING, pct, usdCompact } from '@/lib/format/format';
import { lendingRows, LendingRow } from '@/lib/lending/lending-rows';
import {
  BORROW_BASE,
  BORROW_SLOPE,
  borrowRateModel,
  KINK,
  SUPPLIER_SHARE,
  supplyRateModel,
} from '@/lib/lending/rate-model';
import { useLiveClient } from '@/lib/live/use-live-client';
import { usePolledInfo } from '@/lib/live/use-polled-info';
import { RateCurveChart } from '../components/rate-curve-chart';
import { tableBox } from '../components/table-box';

/** The lending state: every minute on this page (plan §3.2). */
const LENDING_POLL_MS = 60_000;

const td = {
  padding: '0.25rem 0.7rem',
  textAlign: 'right' as const,
  fontVariantNumeric: 'tabular-nums' as const,
  verticalAlign: 'top' as const,
};
const small = { fontSize: '0.8em', color: 'var(--muted-foreground)' };

function Amount({ usd, tokens, name }: { usd: number; tokens: number; name: string }) {
  return (
    <>
      {usdCompact(usd)}
      <br />
      <span style={small}>
        {amountCompact(tokens)} {name}
      </span>
    </>
  );
}

function Explained({ r }: { r: LendingRow }) {
  const gap = KINK - r.utilization;
  return (
    <li>
      <b>{r.name}</b>: {pct(r.utilization, 1)} lent out,{' '}
      {gap >= 0
        ? `${(gap * 100).toFixed(1)} points below the kink, so borrowers pay the base ${pct(r.borrowRate, 2)}`
        : `${(-gap * 100).toFixed(1)} points above the kink, so borrowers pay ${pct(BORROW_BASE, 0)} + ${BORROW_SLOPE} × ${pct(-gap, 1)} = ${pct(r.borrowRate, 2)}`}
      . Suppliers earn {pct(r.borrowRate, 2)} × {pct(r.utilization, 1)} × {SUPPLIER_SHARE} ={' '}
      {pct(supplyRateModel(r.borrowRate, r.utilization), 2)}.
    </li>
  );
}

export function LendingBoard() {
  const { client } = useLiveClient();
  const reply = usePolledInfo<AllBorrowLendReserveStates>(
    client,
    { type: INFO.allBorrowLendReserveStates },
    LENDING_POLL_MS
  );
  if (!client) return null;
  if (!reply.data) {
    return reply.error ? (
      <p style={{ color: 'var(--destructive)' }}>
        Could not load the lending market: {reply.error}
      </p>
    ) : (
      <p style={{ color: 'var(--muted-foreground)' }}>Loading the lending market…</p>
    );
  }

  const rows = lendingRows(reply.data, client.universe.tokenNames);
  const stable = rows.filter((r) => !r.collateral);
  const collateral = rows.filter((r) => r.collateral);
  const sum = (rs: LendingRow[], k: 'suppliedUsd' | 'borrowedUsd'): number =>
    rs.reduce((s, r) => s + r[k], 0);
  const onModel = stable.filter((r) => r.borrowFollowsModel && r.supplyFollowsModel);
  const offModel = rows.filter((r) => r.borrowFollowsModel === false || !r.supplyFollowsModel);
  const th = { ...td, borderBottom: '1px solid var(--border)' };

  return (
    <>
      {reply.error && <p style={{ color: 'var(--warning)' }}>Last refresh failed: {reply.error}</p>}
      <p style={{ fontSize: '1.05em' }}>
        Stablecoins: <b>{usdCompact(sum(stable, 'suppliedUsd'))}</b> supplied,{' '}
        <b>{usdCompact(sum(stable, 'borrowedUsd'))}</b> borrowed.
        {collateral.length > 0 && (
          <>
            {' '}
            Collateral posted: <b>{usdCompact(sum(collateral, 'suppliedUsd'))}</b> (
            {collateral.map((r) => r.name).join(', ')}).
          </>
        )}
      </p>
      <div {...tableBox()}>
        <table style={{ borderCollapse: 'collapse', fontSize: '0.9em' }}>
          <thead>
            <tr>
              {[
                'Token',
                'Supplied',
                'Borrowed',
                'Lent out',
                'Supply rate',
                'Borrow rate',
                'LTV',
              ].map((h, i) => (
                <th key={h} style={{ ...th, textAlign: i === 0 ? 'left' : 'right' }}>
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.token} style={{ borderBottom: '1px solid var(--border)' }}>
                <td style={{ ...td, textAlign: 'left' }}>
                  {r.name}
                  <br />
                  <span style={small}>{r.collateral ? 'collateral' : 'lent out'}</span>
                </td>
                <td style={td}>
                  <Amount usd={r.suppliedUsd} tokens={r.supplied} name={r.name} />
                </td>
                <td style={td}>
                  <Amount usd={r.borrowedUsd} tokens={r.borrowed} name={r.name} />
                </td>
                <td style={td}>{pct(r.utilization, 1)}</td>
                <td style={td}>{pct(r.supplyRate, 2)}</td>
                <td style={td}>{pct(r.borrowRate, 2)}</td>
                <td style={td}>{r.collateral ? r.ltv : MISSING}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p style={{ ...small, maxWidth: '50rem' }}>
        Every token in Hyperliquid&apos;s lending reply, refreshed every minute. Dollar values use
        the reply&apos;s oracle price. &quot;Lent out&quot; is utilization: borrowed ÷ supplied. LTV
        is the share of a collateral token&apos;s value that can be borrowed against it; the
        stablecoins have none. Rates are per year.
      </p>

      <h2>How the rates are set</h2>
      <p
        style={{
          fontFamily: 'ui-monospace, monospace',
          fontSize: '0.9em',
          background: 'var(--muted)',
          padding: '0.5rem',
          maxWidth: '50rem',
        }}
      >
        borrow rate = {pct(BORROW_BASE, 0)} + {BORROW_SLOPE} × max(0, utilization − {pct(KINK, 0)})
        <br />
        supply rate = borrow rate × utilization × {SUPPLIER_SHARE}
      </p>
      <p style={{ maxWidth: '50rem' }}>
        Borrowing a stablecoin costs a flat {pct(BORROW_BASE, 0)} a year until {pct(KINK, 0)} of it
        is lent out, then climbs steeply, to {pct(borrowRateModel(1), 0)} a year when everything is
        lent. Suppliers receive the interest borrowers pay, spread over everything supplied, less
        the {pct(1 - SUPPLIER_SHARE, 0)} Hyperliquid keeps &quot;as a buffer for future
        liquidations&quot;. Source: Hyperliquid&apos;s documentation (portfolio margin), which gives
        this formula for stablecoins only.
      </p>
      {onModel.length > 0 && (
        <>
          <ul style={{ maxWidth: '50rem' }}>
            {onModel.map((r) => (
              <Explained key={r.token} r={r} />
            ))}
          </ul>
          <RateCurveChart rows={onModel} />
        </>
      )}
      {offModel.length > 0 && (
        <p style={{ color: 'var(--warning)', maxWidth: '50rem' }}>
          The rates Hyperliquid reports for {offModel.map((r) => r.name).join(', ')} do not follow
          the documented formula right now, so they are shown as reported and not explained here.
        </p>
      )}
      <p style={{ ...small, maxWidth: '50rem' }}>
        This page shows the market as a whole. No account&apos;s lending, borrowing or health is
        shown.
      </p>
    </>
  );
}
