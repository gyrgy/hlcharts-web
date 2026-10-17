'use client';
/**
 * `/liquidity`, live (plan §3.3): every live perp's impact spread from the
 * contexts (free), and on request each shown market's book, perps and traded
 * spot pairs alike, measured once into depth and cost to trade with the same
 * figures as the market pages (lib/liquidity/measure-book.ts).
 */
import Link from 'next/link';
import { useEffect, useRef, useState } from 'react';
import { Button } from '@/components/ui/button';
import { DEPTH_BANDS, TRADE_SIZES_USD } from '@/lib/book/book-figures';
import { bandLabel, costText, depthText } from '@/lib/book/bound-text';
import { impactNotionalUsd } from '@/lib/book/impact-notional';
import { ago, MISSING, usdCompact } from '@/lib/format/format';
import { MAIN_DEX } from '@/lib/hl/constants';
import { MEASURE_WEIGHT_PER_MARKET, MeasuredBook, measureBook } from '@/lib/liquidity/measure-book';
import { siblingVenue } from '@/lib/markets/sibling-rules';
import { sortBy } from '@/lib/markets/sort-by';
import { MarketRow } from '@/lib/markets/types';
import { useMarketRows } from '@/lib/markets/use-market-rows';
import { Segmented } from '../components/segmented';
import { tableBox } from '../components/table-box';

type Tab = 'all' | 'main' | 'builders' | 'spot';
const TABS: [Tab, string][] = [
  ['all', 'All'],
  ['main', 'Main perps'],
  ['builders', 'Builder exchanges'],
  ['spot', 'Spot'],
];
/** Plan §3.2: measuring spends at most half of the tab's ~600 weight a minute. */
const MEASURE_WEIGHT_PER_MINUTE = 300;
const MEASURE_GAP_MS = (60_000 * MEASURE_WEIGHT_PER_MARKET) / MEASURE_WEIGHT_PER_MINUTE;
/** Markets per press of "Measure": about a minute of reading. */
const MEASURE_BATCH = 50;
/** A book measured more recently than this is not measured again in the next batch. */
const FRESH_MS = 5 * 60_000;
/**
 * Markets measured without a press, the top of the view when the page opens
 * and on each tab change (60 weight): with every measured column blank, the
 * depth and trade-size choices looked as if they did nothing (owner, 2026-10-15).
 */
const AUTO_MEASURE = 10;

interface Column {
  id: string;
  label: string;
  title: string;
  value: (r: MarketRow, m: MeasuredBook | undefined) => number | string | null;
  show: (r: MarketRow, m: MeasuredBook | undefined) => string;
}

const sleep = (ms: number): Promise<void> => new Promise((r) => setTimeout(r, ms));

export function LiquidityView() {
  const { client, rows, ready, startError } = useMarketRows();
  const [tab, setTab] = useState<Tab>('all');
  const [band, setBand] = useState(1);
  const [size, setSize] = useState(1);
  const [sort, setSort] = useState<{ id: string; desc: boolean }>({ id: 'volume', desc: true });
  const [measured, setMeasured] = useState<Map<string, MeasuredBook>>(new Map());
  const [progress, setProgress] = useState<{ done: number; total: number; failed: number } | null>(
    null
  );
  const stop = useRef(false);
  /** A measuring run is going (pressed or automatic): one at a time. */
  const running = useRef(false);
  /** This render's markets due a measurement and the function that measures, for the effect below. */
  const latest = useRef<{ due: MarketRow[]; measure: (t: MarketRow[]) => Promise<void> } | null>(
    null
  );
  useEffect(
    () => () => {
      stop.current = true;
    },
    []
  );
  // The automatic run starts on a timer so React's development double mount
  // cancels the first start instead of stopping it after one market.
  useEffect(() => {
    if (!ready) return;
    const t = setTimeout(() => {
      const l = latest.current;
      if (l && !running.current) void l.measure(l.due.slice(0, AUTO_MEASURE));
    }, 0);
    return () => clearTimeout(t);
  }, [ready, tab]);
  if (!client) return null;
  if (startError)
    return <p style={{ color: 'var(--destructive)' }}>Could not reach Hyperliquid: {startError}</p>;
  if (!ready)
    return (
      <p style={{ color: 'var(--muted-foreground)' }}>Waiting for Hyperliquid&apos;s live data…</p>
    );

  const bandValue = DEPTH_BANDS[band];
  const sizeValue = TRADE_SIZES_USD[size];
  const live = rows.filter((r) => (r.kind === 'spot' ? r.volume24h > 0 : !r.delisted));
  const shown = live.filter((r) =>
    tab === 'all'
      ? true
      : tab === 'spot'
        ? r.kind === 'spot'
        : tab === 'main'
          ? r.kind === 'perp' && r.venue === MAIN_DEX
          : r.kind === 'perp' && r.venue !== MAIN_DEX
  );
  const depth = (m: MeasuredBook | undefined, side: 'bid' | 'ask') =>
    m?.figures?.depth.find((d) => d.band === bandValue)?.[side] ?? null;
  const cost = (m: MeasuredBook | undefined, side: 'buy' | 'sell') =>
    m?.figures?.cost.find((c) => c.usd === sizeValue)?.[side] ?? null;
  const columns: Column[] = [
    {
      id: 'volume',
      label: 'Volume 24 h',
      title: 'Traded value over the last 24 hours',
      value: (r) => r.volume24h,
      show: (r) => usdCompact(r.volume24h),
    },
    {
      id: 'impact',
      label: 'Impact spread',
      title: 'Round trip at the size Hyperliquid measures, bp (perps only)',
      value: (r) => r.impactSpreadBps,
      show: (r) => (r.impactSpreadBps === null ? MISSING : `${r.impactSpreadBps.toFixed(1)} bp`),
    },
    {
      id: 'size',
      label: 'Impact size',
      title: 'The trade size the impact spread is measured at',
      value: (r) => (r.kind === 'perp' ? impactNotionalUsd(r.venue, r.key) : null),
      show: (r) => {
        if (r.kind !== 'perp') return MISSING;
        const n = impactNotionalUsd(r.venue, r.key);
        return n === null ? 'not published' : usdCompact(n);
      },
    },
    {
      id: 'spread',
      label: 'Spread',
      title: 'Best bid to best ask, bp of the mid (measured)',
      value: (_r, m) => m?.spreadBps ?? null,
      show: (_r, m) => (!m ? '' : m.spreadBps === null ? MISSING : `${m.spreadBps.toFixed(1)} bp`),
    },
    {
      id: 'bids',
      label: `Bids ${bandLabel(bandValue)}`,
      title: 'Resting bids within the band below the mid (measured)',
      value: (_r, m) => depth(m, 'bid')?.value ?? null,
      show: (_r, m) => (m ? depthText(depth(m, 'bid')) : ''),
    },
    {
      id: 'asks',
      label: `Asks ${bandLabel(bandValue)}`,
      title: 'Resting asks within the band above the mid (measured)',
      value: (_r, m) => depth(m, 'ask')?.value ?? null,
      show: (_r, m) => (m ? depthText(depth(m, 'ask')) : ''),
    },
    {
      id: 'buy',
      label: `Buy ${usdCompact(sizeValue)}`,
      title: 'Average fill of a market buy of this size against the mid, bp (measured)',
      value: (_r, m) => cost(m, 'buy')?.value ?? null,
      show: (_r, m) => (m ? costText(cost(m, 'buy')) : ''),
    },
    {
      id: 'sell',
      label: `Sell ${usdCompact(sizeValue)}`,
      title: 'Average fill of a market sell of this size against the mid, bp (measured)',
      value: (_r, m) => cost(m, 'sell')?.value ?? null,
      show: (_r, m) => (m ? costText(cost(m, 'sell')) : ''),
    },
    {
      id: 'at',
      label: 'Measured',
      title: 'When this book was read',
      value: (_r, m) => m?.at ?? null,
      show: (_r, m) => (m ? `${ago(Date.now() - m.at)} ago` : ''),
    },
  ];
  const column = columns.find((c) => c.id === sort.id) ?? columns[0];
  const sorted = sortBy(shown, (r) => column.value(r, measured.get(r.key)), sort.desc);
  const now = Date.now();
  const due = sorted.filter((r) => {
    const m = measured.get(r.key);
    return !m || now - m.at > FRESH_MS;
  });

  const measure = async (targets: MarketRow[]): Promise<void> => {
    if (!targets.length) return;
    stop.current = false;
    running.current = true;
    let failed = 0;
    setProgress({ done: 0, total: targets.length, failed });
    try {
      for (const [i, r] of targets.entries()) {
        if (stop.current) break;
        const started = Date.now();
        try {
          const m = await measureBook((body) => client.info.request(body), r.key);
          setMeasured((prev) => new Map(prev).set(r.key, m));
        } catch {
          failed++;
        }
        setProgress({ done: i + 1, total: targets.length, failed });
        const wait = MEASURE_GAP_MS - (Date.now() - started);
        if (wait > 0 && i < targets.length - 1) await sleep(wait);
      }
    } finally {
      running.current = false;
      setProgress(null);
    }
  };
  latest.current = { due, measure };

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
    cursor: 'pointer',
  };

  return (
    <>
      <Segmented
        label="Markets shown"
        value={tab}
        options={TABS.map(([value, label]) => ({ value, label }))}
        onChange={setTab}
      />
      {/* The depth band and trade size only shape the measured columns: they sit with the button that fills them. */}
      <div className="my-3 flex flex-wrap items-center gap-3">
        {progress ? (
          <>
            <span>
              Measuring {progress.done} of {progress.total}
              {progress.failed ? ` (${progress.failed} failed)` : ''}… about{' '}
              {Math.ceil(((progress.total - progress.done) * MEASURE_GAP_MS) / 1000)} s left
            </span>
            <Button variant="outline" onClick={() => (stop.current = true)}>
              Stop
            </Button>
          </>
        ) : (
          <Button onClick={() => void measure(due.slice(0, MEASURE_BATCH))} disabled={!due.length}>
            Measure books: the next {Math.min(MEASURE_BATCH, due.length)} shown
          </Button>
        )}
        <label className="text-sm">
          Depth within{' '}
          <select value={band} onChange={(e) => setBand(Number(e.target.value))}>
            {DEPTH_BANDS.map((b, i) => (
              <option key={b} value={i}>
                {bandLabel(b)}
              </option>
            ))}
          </select>
        </label>
        <label className="text-sm">
          Trade size{' '}
          <select value={size} onChange={(e) => setSize(Number(e.target.value))}>
            {TRADE_SIZES_USD.map((s, i) => (
              <option key={s} value={i}>
                {usdCompact(s)}
              </option>
            ))}
          </select>
        </label>
        <span style={{ fontSize: '0.85em', color: 'var(--muted-foreground)' }}>
          {`${shown.length} markets shown, ${shown.filter((r) => measured.has(r.key)).length} measured: `}
          spread, depth and cost, and the two choices that shape them, apply to measured markets.
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
              <th style={{ ...th, textAlign: 'left', cursor: 'default' }}>Market</th>
              {columns.map((c) => (
                <th
                  key={c.id}
                  title={c.title}
                  style={th}
                  onClick={() => setSort({ id: c.id, desc: sort.id === c.id ? !sort.desc : true })}
                >
                  {c.label}
                  {sort.id === c.id ? (sort.desc ? ' ▼' : ' ▲') : ''}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {sorted.map((r) => {
              const m = measured.get(r.key);
              return (
                <tr key={r.key} style={{ borderBottom: '1px solid var(--border)' }}>
                  <td style={{ ...td, textAlign: 'left' }}>
                    <Link href={r.href}>{r.name}</Link>{' '}
                    <span style={{ fontSize: '0.75em', color: 'var(--muted-foreground)' }}>
                      {siblingVenue(r)}
                    </span>
                  </td>
                  {columns.map((c) => (
                    <td key={c.id} style={td}>
                      {c.show(r, m)}
                    </td>
                  ))}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      <div style={{ fontSize: '0.8em', color: 'var(--muted-foreground)', maxWidth: '50rem' }}>
        <p>
          <b>Impact spread</b> (live, perps only): the gap between the average prices to buy and to
          sell a set size at once, as a share of their midpoint, so what buying and immediately
          selling that size costs before fees. Hyperliquid measures it continuously at $20,000 on
          BTC and ETH and $6,000 on other main-exchange perps; builder exchanges do not publish
          their size, so their figures may not compare exactly. Spot has no impact prices.
        </p>
        <p>
          <b>Measure books</b> reads each shown market&apos;s order book once: the 20 live levels on
          each side and two grouped books that reach further, the same three the market pages use.{' '}
          <b>Depth</b> is the value of orders resting within the band around the mid price.{' '}
          <b>Cost</b> is how far the average fill of a market order of that size lands from the mid,
          one way: the impact spread covers a buy and a sell, so at the same size it is about the
          two costs added. Past the live levels the figures are bounds, depth &quot;at least&quot;
          and cost &quot;at most&quot;, and &quot;not measured&quot; where no book reaches. Books
          are read one market every {MEASURE_GAP_MS / 1000} s (about{' '}
          {Math.round(60_000 / MEASURE_GAP_MS)} a minute) to stay well inside Hyperliquid&apos;s
          allowance for each visitor; each figure is a snapshot, timed in the last column.
        </p>
      </div>
    </>
  );
}
