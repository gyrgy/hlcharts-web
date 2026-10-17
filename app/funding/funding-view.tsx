'use client';
/**
 * `/funding`, live (plan §3.3): every live perp's funding, what sets it this
 * hour, Binance and Bybit next to the main exchange, the builder exchanges'
 * funding parameters, and the spread of rates across markets.
 */
import Link from 'next/link';
import { useEffect, useState } from 'react';
import { bps, MISSING, pct, pctSigned } from '@/lib/format/format';
import { MAIN_DEX } from '@/lib/hl/constants';
import { FundingBoardRow, fundingBoard } from '@/lib/funding/funding-board';
import { fundingHistogram } from '@/lib/funding/funding-histogram';
import { sortBy } from '@/lib/markets/sort-by';
import { useMarketRows } from '@/lib/markets/use-market-rows';
import {
  AT_BASE_COLOUR,
  FundingHistogramChart,
  PREMIUM_SET_COLOUR,
} from '../components/funding-histogram-chart';
import { FundingCompareChart, MAX_PICKS, pickColour } from '../components/funding-compare-chart';
import { Segmented } from '../components/segmented';
import { tableBox } from '../components/table-box';

type Tab = 'main' | 'builders';
type Unit = 'hour' | 'year';
const TABS: { value: Tab; label: string }[] = [
  { value: 'main', label: 'Main exchange' },
  { value: 'builders', label: 'Builder exchanges' },
];
const UNITS: { value: Unit; label: string }[] = [
  { value: 'year', label: 'per year' },
  { value: 'hour', label: 'per hour' },
];
/** Markets the history chart starts on: the most open interest, from the live list. */
const DEFAULT_PICKS = 3;
const HOUR_MS = 3_600_000;
const HOURS_PER_YEAR = 24 * 365;

const STATE_TEXT: Record<FundingBoardRow['state'], string> = {
  band: 'base rate',
  above: 'premium above band',
  below: 'premium below band',
  unexplained: 'not explained',
};

interface Column {
  id: string;
  label: string;
  title: string;
  value: (r: FundingBoardRow) => number | string | null;
  show: (r: FundingBoardRow, unit: Unit) => string;
  tabs: Tab[];
}

const rate = (h: number | null, unit: Unit): string =>
  h === null ? MISSING : unit === 'hour' ? pctSigned(h, 5) : pctSigned(h * HOURS_PER_YEAR, 1);
const inferred = (documented: boolean): string => (documented ? '' : '*');

const COLUMNS: Column[] = [
  {
    id: 'funding',
    label: 'Funding',
    title: 'The current rate for this hour; positive: longs pay shorts',
    value: (r) => r.fundingHourly,
    show: (r, u) => rate(r.fundingHourly, u),
    tabs: ['main', 'builders'],
  },
  {
    id: 'state',
    label: 'Set by',
    title: "Base rate: the hour's premium is inside the band, so the rate is the interest rate",
    value: (r) => STATE_TEXT[r.state],
    show: (r) => STATE_TEXT[r.state],
    tabs: ['main', 'builders'],
  },
  {
    id: 'premium',
    label: 'Premium now',
    title: 'Latest premium sample, bp of the oracle price',
    value: (r) => r.premium,
    show: (r) => (r.premium === null ? MISSING : `${bps(r.premium * 10_000, 1)} bp`),
    tabs: ['main', 'builders'],
  },
  {
    id: 'band',
    label: 'To band edge',
    title:
      'How far the latest premium sample is inside (+) or outside (−) the band where funding stays at the base rate, bp',
    value: (r) => r.bandBps,
    show: (r) => (r.bandBps === null ? MISSING : `${bps(r.bandBps, 1)} bp`),
    tabs: ['main', 'builders'],
  },
  {
    id: 'binance',
    label: 'Binance',
    title: "Binance's next predicted rate, divided by its interval",
    value: (r) => r.binanceHourly,
    show: (r, u) => rate(r.binanceHourly, u),
    tabs: ['main'],
  },
  {
    id: 'bybit',
    label: 'Bybit',
    title: "Bybit's next predicted rate, divided by its interval",
    value: (r) => r.bybitHourly,
    show: (r, u) => rate(r.bybitHourly, u),
    tabs: ['main'],
  },
  {
    id: 'gap',
    label: 'Gap',
    title: 'Hyperliquid minus the average of Binance and Bybit',
    value: (r) => r.cexGapHourly,
    show: (r, u) => rate(r.cexGapHourly, u),
    tabs: ['main'],
  },
  {
    id: 'interest',
    label: 'Interest / 8 h',
    title: "The market's interest rate per 8 hours; * = default, inferred",
    value: (r) => r.params.interest8h,
    show: (r) => `${pct(r.params.interest8h, 4)}${inferred(r.params.documented.interest)}`,
    tabs: ['builders'],
  },
  {
    id: 'clamp',
    label: 'Clamp / 8 h',
    title: 'Half the width of the band, per 8 hours',
    value: (r) => r.params.clamp8h,
    show: (r) => `${pct(r.params.clamp8h, 3)}${inferred(r.params.documented.clamp)}`,
    tabs: ['builders'],
  },
  {
    id: 'multiplier',
    label: 'Multiplier',
    title: 'Scales the whole rate; * = default, inferred',
    value: (r) => r.params.multiplier,
    show: (r) => `${r.params.multiplier}${inferred(r.params.documented.multiplier)}`,
    tabs: ['builders'],
  },
];

function nextPayment(now: number): string {
  const next = Math.ceil(now / HOUR_MS) * HOUR_MS;
  const minutes = Math.floor((next - now) / 60_000);
  const at = new Date(next).toISOString().slice(11, 16);
  return `${minutes} min (${at} UTC)`;
}

export function FundingView() {
  const { client, rows, ready, startError } = useMarketRows();
  const [tab, setTab] = useState<Tab>('main');
  const [unit, setUnit] = useState<Unit>('year');
  const [exchange, setExchange] = useState('');
  const [sort, setSort] = useState<{ id: string; desc: boolean }>({ id: 'funding', desc: true });
  const [picks, setPicks] = useState<string[] | null>(null);
  // Start the history chart on the perps with the most open interest, chosen
  // once from the live list (no fixed coins); the visitor changes it from there.
  useEffect(() => {
    if (picks !== null || !ready) return;
    const live = rows.filter((r) => r.kind === 'perp' && !r.delisted);
    setPicks(
      sortBy(live, (r) => r.oiUsd, true)
        .slice(0, DEFAULT_PICKS)
        .map((r) => r.key)
    );
  }, [picks, ready, rows]);
  if (!client) return null;
  if (startError)
    return <p style={{ color: 'var(--destructive)' }}>Could not reach Hyperliquid: {startError}</p>;
  if (!ready)
    return (
      <p style={{ color: 'var(--muted-foreground)' }}>Waiting for Hyperliquid&apos;s live data…</p>
    );

  const board = fundingBoard(rows, client.universe.dexes);
  const builders = client.universe.liveDexes().filter((d) => d !== MAIN_DEX);
  const shown = board.filter((r) =>
    tab === 'main'
      ? r.venue === MAIN_DEX
      : r.venue !== MAIN_DEX && (!exchange || r.venue === exchange)
  );
  const columns = COLUMNS.filter((c) => c.tabs.includes(tab));
  const sortColumn = columns.find((c) => c.id === sort.id) ?? columns[0];
  const sorted = sortBy(shown, sortColumn.value, sort.desc);
  const atBase = board.filter((r) => r.state === 'band').length;
  const picked = picks ?? [];
  const label = (key: string): string => {
    const r = board.find((b) => b.key === key);
    return r ? (r.venue === MAIN_DEX ? r.name : `${r.name} (${r.venue})`) : key;
  };
  const toggle = (key: string): void =>
    setPicks(picked.includes(key) ? picked.filter((k) => k !== key) : [...picked, key]);
  const td = {
    padding: '0.2rem 0.6rem',
    textAlign: 'right' as const,
    whiteSpace: 'nowrap' as const,
  };
  const th = {
    ...td,
    borderBottom: '1px solid var(--border)',
    cursor: 'pointer',
    position: 'sticky' as const,
    top: 0,
    background: 'var(--background)',
  };

  return (
    <>
      <p>
        Funding is paid every hour, on every perp. Next payment in <b>{nextPayment(Date.now())}</b>.{' '}
        {atBase} of {board.length} live perps are at their base rate this hour; on the rest the
        premium sets the rate.
      </p>

      <h2>Across markets</h2>
      <FundingHistogramChart bins={fundingHistogram(board)} />
      <p style={{ fontSize: '0.85em', margin: '0.2rem 0 1rem' }}>
        <span style={{ color: AT_BASE_COLOUR, fontWeight: 700 }}>■</span> at the base rate ·{' '}
        <span style={{ color: PREMIUM_SET_COLOUR, fontWeight: 700 }}>■</span> set by the premium.
        Every live perp, main and builder exchanges, by its current rate per year.
      </p>

      <h2>Every perp</h2>
      <div className="flex flex-wrap items-center gap-3">
        <Segmented label="Exchanges shown" value={tab} options={TABS} onChange={setTab} />
        {tab === 'builders' && (
          <select value={exchange} onChange={(e) => setExchange(e.target.value)}>
            <option value="">All builder exchanges</option>
            {builders.map((d) => (
              <option key={d} value={d}>
                {d}
              </option>
            ))}
          </select>
        )}
        <Segmented label="Rate unit" value={unit} options={UNITS} onChange={setUnit} />
      </div>
      {/* The strip sticks to the bottom of the screen while the table is in view: ticking a box
          shows at once, though the chart is further down. */}
      <div>
        <div {...tableBox('75vh', 'mt-2')}>
          <table
            style={{
              borderCollapse: 'collapse',
              fontSize: '0.9em',
              fontVariantNumeric: 'tabular-nums',
            }}
          >
            <thead>
              <tr>
                <th
                  style={{ ...th, textAlign: 'center', cursor: 'default' }}
                  title={`Chart up to ${MAX_PICKS} markets' history below`}
                >
                  Chart
                </th>
                <th style={{ ...th, textAlign: 'left', cursor: 'default' }}>Market</th>
                {columns.map((c) => (
                  <th
                    key={c.id}
                    title={c.title}
                    style={th}
                    onClick={() =>
                      setSort({ id: c.id, desc: sort.id === c.id ? !sort.desc : true })
                    }
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
                  <td style={{ ...td, textAlign: 'center' }}>
                    <input
                      type="checkbox"
                      aria-label={`Chart ${label(r.key)}`}
                      checked={picked.includes(r.key)}
                      disabled={!picked.includes(r.key) && picked.length >= MAX_PICKS}
                      onChange={() => toggle(r.key)}
                      style={
                        picked.includes(r.key)
                          ? { accentColor: pickColour(picked.indexOf(r.key)) }
                          : undefined
                      }
                    />
                  </td>
                  <td style={{ ...td, textAlign: 'left' }}>
                    <Link href={r.href}>{r.name}</Link>
                    {r.venue !== MAIN_DEX && (
                      <span style={{ fontSize: '0.75em', color: 'var(--muted-foreground)' }}>
                        {' '}
                        {r.venue}
                      </span>
                    )}
                  </td>
                  {columns.map((c) => (
                    <td key={c.id} style={td}>
                      {c.show(r, unit)}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div
          style={{
            position: 'sticky',
            bottom: 0,
            background: 'var(--background)',
            borderTop: '1px solid var(--border)',
            padding: '0.4rem 0',
            fontSize: '0.9em',
            display: 'flex',
            flexWrap: 'wrap',
            gap: '0.2rem 0.8rem',
            alignItems: 'baseline',
          }}
        >
          {picked.length ? (
            <>
              <span>
                On the history chart ({picked.length} of {MAX_PICKS}):
              </span>
              {picked.map((key, i) => (
                <span key={key} style={{ whiteSpace: 'nowrap' }}>
                  <span aria-hidden style={{ color: pickColour(i) }}>
                    ●
                  </span>{' '}
                  {label(key)}
                </span>
              ))}
              <Link href="#history">Go to the chart ↓</Link>
            </>
          ) : (
            <span style={{ color: 'var(--muted-foreground)' }}>
              Tick up to {MAX_PICKS} markets to chart their funding history below.
            </span>
          )}
        </div>
      </div>
      <div style={{ fontSize: '0.8em', color: 'var(--muted-foreground)', maxWidth: '50rem' }}>
        <p>
          Positive funding: longs pay shorts; negative: shorts pay longs. Per year is the hourly
          rate × 24 × 365. <b>Set by:</b> while the hour&apos;s average premium stays inside the
          band (the interest rate ± the clamp, per 8 hours), funding is the base rate: the interest
          rate, times the multiplier on builder exchanges. Outside it, the premium sets the rate.{' '}
          <b>Premium now</b> is Hyperliquid&apos;s latest sample (every 5 seconds); the hour&apos;s
          average, not one sample, sets the rate. <b>To band edge</b> is how far that sample sits
          inside (+) or outside (−) the band. The two can disagree, because one sample is not the
          hour&apos;s average: they did on 50 of 330 perps when checked (2026-10-04).
        </p>
        {tab === 'main' ? (
          <p>
            Binance and Bybit: their next predicted rates, divided by their own interval (1, 4 or 8
            hours), refreshed every minute; missing where they do not list the coin or give no
            interval. Hyperliquid&apos;s own predicted rate is not a separate column: when checked
            (2026-10-04) it equalled the current rate on 154 of 178 main-exchange perps and differed
            only by when each was sampled on the rest.
          </p>
        ) : (
          <p>
            Interest, clamp and multiplier are each exchange&apos;s settings for that market
            (perpDexs). * marks a default: the clamp&apos;s (0.03%) is documented; the interest
            rate&apos;s (0.01%) and the multiplier&apos;s (1) are not, and are inferred from live
            rates. Builder exchanges are not in Binance&apos;s or Bybit&apos;s comparison:
            Hyperliquid publishes predicted rates for main-exchange perps only.
          </p>
        )}
      </div>

      <h2 id="history">History</h2>
      <p style={{ maxWidth: '50rem' }}>
        Up to {MAX_PICKS} markets side by side: tick them in the table above. It starts on the{' '}
        {DEFAULT_PICKS} perps with the most open interest right now.
      </p>
      <FundingCompareChart
        picks={picked.map((key) => ({ key, label: label(key) }))}
        unit={unit}
        onRemove={toggle}
      />
    </>
  );
}
