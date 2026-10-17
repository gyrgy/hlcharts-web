'use client';

import Link from 'next/link';
import { useEffect, useRef, useState } from 'react';
import { MAIN_DEX } from '@/lib/hl/constants';
import { ago, bps, MISSING, pct, pctSigned, price, usdCompact } from '@/lib/format/format';
import { buildPerpRows } from '@/lib/markets/build-perp-rows';
import { SPOT_VENUE } from '@/lib/markets/build-spot-rows';
import { SortKey, sortRows } from '@/lib/markets/sort-rows';
import { MarketRow } from '@/lib/markets/types';
import { OiMemory, oiMemory, OiSnapshot } from '@/lib/markets/oi-memory';
import { oiSnapshot } from '@/lib/markets/oi-snapshot';
import { useMarketRows } from '@/lib/markets/use-market-rows';
import { withOiChange } from '@/lib/markets/with-oi-change';
import { NEAR_CAP } from '@/lib/oi/near-cap';
import { Segmented } from '../components/segmented';
import { tableBox } from '../components/table-box';

type Tab = 'all' | 'main' | 'builders' | 'spot';
/** The builder-exchange filter's "every exchange" choice (a choice cannot be empty). */
const ALL_BUILDERS = '*';
const TABS: [Tab, string][] = [
  ['all', 'All'],
  ['main', 'Main perps'],
  ['builders', 'Builder exchanges'],
  ['spot', 'Spot'],
];

interface Column {
  key: SortKey;
  label: string;
  title: string;
  /** Shown on these tabs. */
  tabs: Tab[];
  cell: (r: MarketRow) => string;
  /** Colour a signed value. */
  signed?: (r: MarketRow) => number | null;
}

const PERPS: Tab[] = ['all', 'main', 'builders'];
const ALL: Tab[] = ['all', 'main', 'builders', 'spot'];

const COLUMNS: Column[] = [
  {
    key: 'markPx',
    label: 'Price',
    title: 'Mark price (spot: mark of the pair, in its quote currency)',
    tabs: ALL,
    cell: (r) => price(r.markPx),
  },
  {
    key: 'change24h',
    label: '24 h',
    title: 'Change against the price 24 hours ago',
    tabs: ALL,
    cell: (r) => pctSigned(r.change24h),
    signed: (r) => r.change24h,
  },
  {
    key: 'volume24h',
    label: 'Volume 24 h',
    title: 'Traded value over the last 24 hours',
    tabs: ALL,
    cell: (r) => usdCompact(r.volume24h),
  },
  {
    key: 'oiUsd',
    label: 'Open interest',
    title: 'Open interest in dollars (contracts × mark)',
    tabs: PERPS,
    cell: (r) => usdCompact(r.oiUsd),
  },
  {
    key: 'fundingHourly',
    label: 'Funding /h',
    title: 'Funding rate per hour; positive: longs pay shorts',
    tabs: PERPS,
    cell: (r) => pctSigned(r.fundingHourly, 4),
    signed: (r) => r.fundingHourly,
  },
  {
    key: 'fundingHourly',
    label: 'Funding /yr',
    title: 'The hourly rate × 24 × 365, not compounded',
    tabs: PERPS,
    cell: (r) => (r.fundingHourly === null ? MISSING : pctSigned(r.fundingHourly * 24 * 365, 1)),
    signed: (r) => r.fundingHourly,
  },
  {
    key: 'basisBps',
    label: 'Basis (bps)',
    title: 'Mark against oracle price, in basis points (hundredths of a percent)',
    tabs: PERPS,
    cell: (r) => bps(r.basisBps),
    signed: (r) => r.basisBps,
  },
  {
    key: 'impactSpreadBps',
    label: 'Cost to trade (bps)',
    title:
      "Spread between Hyperliquid's impact bid and ask: the round-trip cost of a trade of its impact size. Spot: not published (n/a)",
    tabs: ALL,
    cell: (r) => (r.kind === 'spot' ? 'n/a' : bps(r.impactSpreadBps)),
  },
  {
    key: 'maxLeverage',
    label: 'Max lev.',
    title: 'Maximum leverage',
    tabs: PERPS,
    cell: (r) => (r.maxLeverage === null ? MISSING : `${r.maxLeverage}×`),
  },
  {
    key: 'capUse',
    label: 'Cap use',
    title:
      'Builder exchanges: open interest as a share of the market\'s cap. Main exchange: "at cap" when Hyperliquid lists it there',
    tabs: PERPS,
    cell: (r) => (r.atCap ? 'at cap' : r.venue === MAIN_DEX ? '' : pct(r.capUse)),
  },
  {
    key: 'binanceHourly',
    label: 'Binance /yr',
    title:
      "Binance's predicted funding, put on Hyperliquid's hourly basis (Binance settles every 1, 4 or 8 hours) and × 24 × 365",
    tabs: ['main'],
    cell: (r) => yearly(r.binanceHourly),
    signed: (r) => r.binanceHourly,
  },
  {
    key: 'bybitHourly',
    label: 'Bybit /yr',
    title: "Bybit's predicted funding, on the same hourly basis, × 24 × 365",
    tabs: ['main'],
    cell: (r) => yearly(r.bybitHourly),
    signed: (r) => r.bybitHourly,
  },
  {
    key: 'cexGapHourly',
    label: 'HL − CEX /yr',
    title:
      "Hyperliquid's funding minus the average of Binance's and Bybit's predicted funding, per year",
    tabs: ['main'],
    cell: (r) => yearly(r.cexGapHourly),
    signed: (r) => r.cexGapHourly,
  },
];

/** Shown only while the visitor has the open-interest memory switched on. */
const OI_CHANGE_COLUMN: Column = {
  key: 'oiChange',
  label: 'OI vs last visit',
  title:
    'Open interest in contracts against the figure this browser remembered at your last visit (switch below)',
  tabs: ['all', 'main', 'builders'],
  cell: (r) => pctSigned(r.oiChange, 1),
  signed: (r) => r.oiChange,
};

const yearly = (hourly: number | null): string =>
  hourly === null ? MISSING : pctSigned(hourly * 24 * 365, 1);

/** The browser's localStorage, or null where it is blocked. */
function browserStorage(): Storage | null {
  try {
    return window.localStorage;
  } catch {
    return null;
  }
}

/** Spot pairs with no trade in 24 h: about 250 of 330 on 2026-10-04, hidden unless asked for. */
const isInactiveSpot = (r: MarketRow): boolean => r.kind === 'spot' && !(r.volume24h > 0);

const venueLabel = (v: string): string => (v === MAIN_DEX ? 'main' : v);

export function MarketsTable() {
  const { client, startError, rows: live, spotError } = useMarketRows();
  const [memory, setMemory] = useState<OiMemory | null>(null);
  const [oiOn, setOiOn] = useState(false);
  const [previous, setPrevious] = useState<OiSnapshot | null>(null);
  const remembered = useRef(false);
  const [multiVenueOnly, setMultiVenueOnly] = useState(false);
  const [tab, setTab] = useState<Tab>('all');
  const [builder, setBuilder] = useState<string>('');
  const [showDelisted, setShowDelisted] = useState(false);
  const [showInactive, setShowInactive] = useState(false);
  const [nearCapOnly, setNearCapOnly] = useState(false);
  const [sort, setSort] = useState<{ key: SortKey; label: string; desc: boolean }>({
    key: 'volume24h',
    label: 'Volume 24 h',
    desc: true,
  });

  // Opt-in memory: read what an earlier visit stored, only if switched on.
  useEffect(() => {
    const m = oiMemory(browserStorage());
    setMemory(m);
    if (m.isOn()) {
      setOiOn(true);
      setPrevious(m.read());
    }
  }, []);
  // Remember this visit's open interest once, when it has loaded, for next time.
  useEffect(() => {
    if (!client || !memory || !oiOn || remembered.current) return;
    const perps = client.store.perps();
    if (!perps.length) return;
    const rows = buildPerpRows(perps, () => undefined, client.universe.dexes, new Set());
    memory.write(oiSnapshot(rows, Date.now()));
    remembered.current = true;
  });
  const switchMemory = (on: boolean): void => {
    if (!memory) return;
    if (on) memory.turnOn();
    else memory.turnOff();
    setOiOn(on);
    setPrevious(null);
    remembered.current = false;
  };

  if (!client) return <p>Loading…</p>;

  const enriched = withOiChange(live, oiOn ? previous : null);
  const perpRows = enriched.filter((r) => r.kind === 'perp');
  const spots = enriched.filter((r) => r.kind === 'spot');
  const builders = client.universe.liveDexes().filter((d) => d !== MAIN_DEX);

  let rows: MarketRow[] =
    tab === 'spot'
      ? spots
      : tab === 'main'
        ? perpRows.filter((r) => r.venue === MAIN_DEX)
        : tab === 'builders'
          ? perpRows.filter((r) => r.venue !== MAIN_DEX && (!builder || r.venue === builder))
          : enriched;
  const delistedCount = rows.filter((r) => r.delisted).length;
  const inactiveCount = rows.filter(isInactiveSpot).length;
  if (!showDelisted) rows = rows.filter((r) => !r.delisted);
  if (!showInactive) rows = rows.filter((r) => !isInactiveSpot(r));
  if (nearCapOnly) rows = rows.filter((r) => r.atCap || (r.capUse ?? 0) >= NEAR_CAP);
  if (multiVenueOnly) rows = rows.filter((r) => r.alsoOn.length > 0);
  rows = sortRows(rows, sort.key, sort.desc);
  const columns = [...COLUMNS, ...(oiOn ? [OI_CHANGE_COLUMN] : [])].filter((c) =>
    c.tabs.includes(tab)
  );
  const unavailable = [...client.store.dexState.entries()]
    .filter(([, s]) => s === 'unavailable')
    .map(([d]) => venueLabel(d));
  const pending = client.store.perps().length === 0;

  const th = {
    textAlign: 'right' as const,
    padding: '0.35rem 0.6rem',
    cursor: 'pointer',
    whiteSpace: 'nowrap' as const,
    borderBottom: '1px solid var(--border)',
    position: 'sticky' as const,
    top: 0,
    background: 'var(--background)',
  };
  const td = {
    textAlign: 'right' as const,
    padding: '0.25rem 0.6rem',
    whiteSpace: 'nowrap' as const,
    fontVariantNumeric: 'tabular-nums' as const,
  };
  const sortBy = (c: { key: SortKey; label: string }) =>
    setSort((s) =>
      s.label === c.label
        ? { ...s, desc: !s.desc }
        : { key: c.key, label: c.label, desc: c.key !== 'name' }
    );

  return (
    <section>
      <Segmented
        label="Markets shown"
        value={tab}
        options={TABS.map(([value, label]) => ({ value, label }))}
        onChange={setTab}
        className="mt-4 mb-2"
      />
      {tab === 'builders' && (
        <Segmented
          label="Builder exchange"
          value={builder || ALL_BUILDERS}
          options={[
            { value: ALL_BUILDERS, label: 'all builder exchanges' },
            ...builders.map((b) => ({ value: b, label: b })),
          ]}
          onChange={(b) => setBuilder(b === ALL_BUILDERS ? '' : b)}
          className="mb-2"
        />
      )}
      <div
        style={{
          display: 'flex',
          flexWrap: 'wrap',
          gap: '1.5rem',
          fontSize: '0.9em',
          margin: '0.5rem 0',
        }}
      >
        <label>
          <input
            type="checkbox"
            checked={nearCapOnly}
            onChange={(e) => setNearCapOnly(e.target.checked)}
          />{' '}
          at or near open-interest cap ({pct(NEAR_CAP, 0)}+)
        </label>
        <label>
          <input
            type="checkbox"
            checked={multiVenueOnly}
            onChange={(e) => setMultiVenueOnly(e.target.checked)}
          />{' '}
          listed on more than one venue
        </label>
        <label>
          <input
            type="checkbox"
            checked={showDelisted}
            onChange={(e) => setShowDelisted(e.target.checked)}
          />{' '}
          show {delistedCount} delisted
        </label>
        {inactiveCount > 0 || showInactive ? (
          <label>
            <input
              type="checkbox"
              checked={showInactive}
              onChange={(e) => setShowInactive(e.target.checked)}
            />{' '}
            show {inactiveCount} spot pairs with no trades in 24 h
          </label>
        ) : null}
        <span style={{ color: 'var(--muted-foreground)' }}>
          {rows.length} markets, sorted by {sort.label.toLowerCase()} (
          {sort.desc ? 'highest' : 'lowest'} first)
        </span>
      </div>
      {startError && (
        <p style={{ color: 'var(--destructive)' }}>
          Could not load Hyperliquid&apos;s market list: {startError}
        </p>
      )}
      {unavailable.length > 0 && (
        <p style={{ color: 'var(--warning)' }}>
          Not shown: {unavailable.join(', ')}. Hyperliquid&apos;s live data for{' '}
          {unavailable.length > 1 ? 'these exchanges' : 'this exchange'} did not match its market
          list, so its numbers could not be labelled safely.
        </p>
      )}
      {spotError && tab !== 'main' && (
        <p style={{ color: 'var(--warning)' }}>Spot data: {spotError}</p>
      )}
      {pending && tab !== 'spot' ? (
        <p>Waiting for Hyperliquid&apos;s live data…</p>
      ) : (
        <div {...tableBox('75vh')}>
          <table style={{ borderCollapse: 'collapse', fontSize: '0.9em' }}>
            <thead>
              <tr>
                <th
                  style={{ ...th, textAlign: 'left', left: 0, zIndex: 2 }}
                  onClick={() => sortBy({ key: 'name', label: 'Market' })}
                  title="Market; the badge is its venue"
                >
                  Market
                </th>
                {columns.map((c) => (
                  <th key={c.label} style={th} title={c.title} onClick={() => sortBy(c)}>
                    {c.label}
                    {sort.label === c.label ? (sort.desc ? ' ▼' : ' ▲') : ''}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr
                  key={r.key}
                  style={{
                    borderBottom: '1px solid var(--border)',
                    color: r.delisted ? 'var(--muted-foreground)' : undefined,
                  }}
                >
                  <td
                    style={{
                      ...td,
                      textAlign: 'left',
                      position: 'sticky',
                      left: 0,
                      background: 'var(--background)',
                    }}
                  >
                    <Link href={r.href} style={{ color: 'inherit' }}>
                      <b>{r.name}</b>
                    </Link>{' '}
                    <span
                      style={{
                        fontSize: '0.75em',
                        padding: '0 0.3rem',
                        border: '1px solid var(--border)',
                        borderRadius: 3,
                        color: 'var(--muted-foreground)',
                      }}
                    >
                      {r.kind === 'spot' ? SPOT_VENUE : venueLabel(r.venue)}
                    </span>
                    {r.delisted && <span style={{ fontSize: '0.75em' }}> · delisted</span>}
                    {r.isolatedOnly && (
                      <span
                        style={{ fontSize: '0.75em', color: 'var(--muted-foreground)' }}
                        title="Positions in this market use isolated margin only"
                      >
                        {' '}
                        · isolated
                      </span>
                    )}
                    {r.alsoOn.length > 0 && (
                      <span
                        style={{ fontSize: '0.75em', color: '#0a58ca' }}
                        title="The same asset trades there too, at a price within 2% of this one"
                      >
                        {' '}
                        · also on {r.alsoOn.join(', ')}
                      </span>
                    )}
                  </td>
                  {columns.map((c) => {
                    const s = c.signed?.(r);
                    return (
                      <td
                        key={c.label}
                        style={{
                          ...td,
                          color: s ? (s > 0 ? 'var(--positive)' : 'var(--destructive)') : undefined,
                        }}
                      >
                        {c.cell(r)}
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      <p style={{ fontSize: '0.9em', maxWidth: '50rem' }}>
        <label>
          <input
            type="checkbox"
            checked={oiOn}
            disabled={!memory}
            onChange={(e) => switchMemory(e.target.checked)}
          />{' '}
          Remember open interest in this browser, to show its change since your last visit
        </label>
        <br />
        <span style={{ color: 'var(--muted-foreground)' }}>
          {oiOn
            ? previous
              ? `Compared with your visit ${ago(Date.now() - previous.at)} ago. Stored only on this device; unticking deletes it.`
              : 'Remembered from now on: the change shows from your next visit. Stored only on this device; unticking deletes it.'
            : 'Off: nothing is stored.'}
        </span>
      </p>
      <p style={{ color: 'var(--muted-foreground)', fontSize: '0.85em', maxWidth: '50rem' }}>
        Source: Hyperliquid&apos;s public API (<code>allDexsAssetCtxs</code>,{' '}
        <code>fastAssetCtxs</code>, <code>spotMetaAndAssetCtxs</code>, <code>perpDexs</code>,{' '}
        <code>perpsAtOpenInterestCap</code>, <code>predictedFundings</code>), read by your browser.
        Prediction markets are not listed.
      </p>
    </section>
  );
}
