'use client';
/**
 * `/open-interest`, live (plan §3.3): open interest by exchange and by market
 * (treemap and table), open interest against 24 h volume, and how full each
 * market's cap is.
 */
import Link from 'next/link';
import { useState } from 'react';
import { MISSING, pct, usdCompact } from '@/lib/format/format';
import { venueSummary } from '@/lib/home/venue-summary';
import { MAIN_DEX } from '@/lib/hl/constants';
import { sortBy } from '@/lib/markets/sort-by';
import { useMarketRows } from '@/lib/markets/use-market-rows';
import { NEAR_CAP } from '@/lib/oi/near-cap';
import { oiBoard, OiRow } from '@/lib/oi/oi-board';
import { OiTreemap } from '../components/oi-treemap';
import { tableBox } from '../components/table-box';

const venueName = (v: string): string => (v === MAIN_DEX ? 'main' : v);
const ratio = (x: number | null): string =>
  x === null ? MISSING : `${x.toFixed(x < 10 ? 2 : 0)}×`;

interface Column {
  id: string;
  label: string;
  title: string;
  value: (r: OiRow) => number | string | null;
  show: (r: OiRow) => string;
}

const COLUMNS: Column[] = [
  {
    id: 'oi',
    label: 'Open interest',
    title: 'Contracts open (one side) × mark price',
    value: (r) => r.oiUsd,
    show: (r) => usdCompact(r.oiUsd),
  },
  {
    id: 'share',
    label: 'Of its exchange',
    title: "Share of this exchange's open interest",
    value: (r) => r.venueShare,
    show: (r) => pct(r.venueShare, 1),
  },
  {
    id: 'volume',
    label: 'Volume 24 h',
    title: 'Traded value over the last 24 hours',
    value: (r) => r.volume24h,
    show: (r) => usdCompact(r.volume24h),
  },
  {
    id: 'ratio',
    label: 'OI ÷ volume',
    title: "Open interest divided by the last 24 hours' volume",
    value: (r) => r.oiPerVolume,
    show: (r) => ratio(r.oiPerVolume),
  },
  {
    id: 'cap',
    label: 'Cap',
    title: "The builder exchange's cap on this market's open interest, in USD",
    value: (r) => r.capUsd,
    show: (r) =>
      r.capUsd === null ? (r.venue === MAIN_DEX ? 'not published' : MISSING) : usdCompact(r.capUsd),
  },
  {
    id: 'capUse',
    label: 'Cap use',
    title: 'Open interest ÷ cap; on the main exchange, whether Hyperliquid lists it at its cap',
    value: (r) => (r.atCap ? Infinity : r.capUse),
    show: (r) => (r.atCap ? 'at cap' : r.capUse === null ? MISSING : pct(r.capUse, 1)),
  },
];

export function OiView() {
  const { client, rows, ready, startError } = useMarketRows();
  const [exchange, setExchange] = useState<string | null>(null);
  const [sort, setSort] = useState<{ id: string; desc: boolean }>({ id: 'oi', desc: true });
  if (!client) return null;
  if (startError)
    return <p style={{ color: 'var(--destructive)' }}>Could not reach Hyperliquid: {startError}</p>;
  if (!ready)
    return (
      <p style={{ color: 'var(--muted-foreground)' }}>Waiting for Hyperliquid&apos;s live data…</p>
    );

  const board = oiBoard(rows, client.universe.dexes);
  const venues = client.universe.liveDexes();
  const summary = venueSummary(rows).filter((v) => v.oiUsd !== null);
  const totalOi = summary.reduce((s, v) => s + (v.oiUsd ?? 0), 0);
  const shown = exchange === null ? board : board.filter((r) => r.venue === exchange);
  const column = COLUMNS.find((c) => c.id === sort.id) ?? COLUMNS[0];
  const sorted = sortBy(shown, column.value, sort.desc);
  const mainAtCap = board.filter((r) => r.atCap).length;
  const nearCap = (v: string): number =>
    board.filter((r) => r.venue === v && (r.capUse ?? 0) >= NEAR_CAP).length;
  const td = {
    padding: '0.2rem 0.6rem',
    textAlign: 'right' as const,
    whiteSpace: 'nowrap' as const,
  };
  const th = {
    ...td,
    borderBottom: '1px solid var(--border)',
    position: 'sticky' as const,
    top: 0,
    background: 'var(--background)',
  };

  return (
    <>
      <h2>By exchange</h2>
      <div {...tableBox()}>
        <table
          style={{
            borderCollapse: 'collapse',
            fontSize: '0.9em',
            fontVariantNumeric: 'tabular-nums',
          }}
        >
          <thead>
            <tr>
              {[
                'Exchange',
                'Open interest',
                'Share',
                'Volume 24 h',
                'OI ÷ volume',
                'Live markets',
                'At or near cap',
              ].map((h, i) => (
                <th key={h} style={{ ...th, textAlign: i === 0 ? 'left' : 'right' }}>
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {summary.map((v) => (
              <tr key={v.venue} style={{ borderBottom: '1px solid var(--border)' }}>
                <td style={{ ...td, textAlign: 'left' }}>{v.label}</td>
                <td style={td}>{usdCompact(v.oiUsd)}</td>
                <td style={td}>{totalOi > 0 ? pct((v.oiUsd ?? 0) / totalOi, 1) : MISSING}</td>
                <td style={td}>{usdCompact(v.volume24h)}</td>
                <td style={td}>{ratio(v.volume24h > 0 ? (v.oiUsd ?? 0) / v.volume24h : null)}</td>
                <td style={td}>{v.live}</td>
                <td style={td}>
                  {v.venue === MAIN_DEX
                    ? `${mainAtCap} at cap`
                    : `${nearCap(v.venue)} at ${pct(NEAR_CAP, 0)}+`}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <h2>By market</h2>
      <OiTreemap rows={board} venues={venues} />
      <p style={{ fontSize: '0.8em', color: 'var(--muted-foreground)', maxWidth: '50rem' }}>
        Each block is an exchange, each tile a live market, sized by open interest. Hover for the
        figures, click to open the market. Tiles too small to label still count.
      </p>

      <div
        style={{ display: 'flex', gap: '0.8rem', alignItems: 'center', margin: '1rem 0 0.4rem' }}
      >
        <select
          value={exchange ?? '*'}
          onChange={(e) => setExchange(e.target.value === '*' ? null : e.target.value)}
        >
          <option value="*">All exchanges</option>
          {venues.map((v) => (
            <option key={v} value={v}>
              {venueName(v)}
            </option>
          ))}
        </select>
        <span style={{ fontSize: '0.85em', color: 'var(--muted-foreground)' }}>
          {shown.length} live perps
        </span>
      </div>
      <div {...tableBox('75vh')}>
        <table
          style={{
            borderCollapse: 'collapse',
            fontSize: '0.9em',
            fontVariantNumeric: 'tabular-nums',
          }}
        >
          <thead>
            <tr>
              <th style={{ ...th, textAlign: 'left' }}>Market</th>
              {COLUMNS.map((c) => (
                <th
                  key={c.id}
                  title={c.title}
                  style={{ ...th, cursor: 'pointer' }}
                  onClick={() => setSort({ id: c.id, desc: sort.id === c.id ? !sort.desc : true })}
                >
                  {c.label}
                  {sort.id === c.id ? (sort.desc ? ' ▼' : ' ▲') : ''}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {sorted.map((r) => (
              <tr key={r.key} style={{ borderBottom: '1px solid var(--border)' }}>
                <td style={{ ...td, textAlign: 'left' }}>
                  <Link href={r.href}>{r.name}</Link>{' '}
                  <span style={{ fontSize: '0.75em', color: 'var(--muted-foreground)' }}>
                    {venueName(r.venue)}
                  </span>
                </td>
                {COLUMNS.map((c) => (
                  <td key={c.id} style={td}>
                    {c.show(r)}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div style={{ fontSize: '0.8em', color: 'var(--muted-foreground)', maxWidth: '50rem' }}>
        <p>
          <b>Open interest</b> is the contracts open on one side (every long has a short) × the mark
          price. <b>OI ÷ volume</b> divides it by the last 24 hours&apos; traded value: above 1×,
          more is held open than traded in a day; a rough sign of how long positions stay open.
        </p>
        <p>
          <b>Caps.</b> Each builder exchange caps every market&apos;s open interest in dollars
          (Hyperliquid&apos;s documentation: notional, position size × mark price), and its total
          too. Cap use here is the one-sided open interest above ÷ the cap. That the cap counts one
          side is our reading of live data, not the documentation: counted that way no market was
          over its cap when checked (highest 85%, 2026-10-04), while counting both sides would have
          put six over. The main exchange does not publish its caps; it lists the markets at their
          cap, and that list includes delisted markets, which are left out here.
        </p>
      </div>
    </>
  );
}
