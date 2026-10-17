'use client';
/**
 * `/exchanges/compare`, live (plan §3.3): the exchanges with live markets side
 * by side (the main exchange as the reference), and the assets listed on more
 * than one of them.
 */
import Link from 'next/link';
import type { ReactNode } from 'react';
import { exchangeSummaries } from '@/lib/exchanges/exchange-summaries';
import { sharedAssets } from '@/lib/exchanges/shared-assets';
import { useExchangeListings } from '@/lib/exchanges/use-exchange-listings';
import { useTotalCaps } from '@/lib/exchanges/use-total-caps';
import { venueQuality } from '@/lib/exchanges/venue-quality';
import { MISSING, pct, pctSigned, price, shortAddress, usdCompact } from '@/lib/format/format';
import { fundingBoard } from '@/lib/funding/funding-board';
import { MAIN_DEX } from '@/lib/hl/constants';
import { exchangePath } from '@/lib/markets/market-paths';
import { siblingVenue } from '@/lib/markets/sibling-rules';
import { useMarketRows } from '@/lib/markets/use-market-rows';
import { tableBox } from '../../components/table-box';

const HOURS_PER_YEAR = 24 * 365;
const counted = (xs: (string | number)[]): string => {
  const m = new Map<string, number>();
  for (const x of xs) m.set(String(x), (m.get(String(x)) ?? 0) + 1);
  return [...m].map(([v, n]) => (m.size > 1 ? `${v} (${n})` : v)).join(', ') || MISSING;
};

export function CompareView() {
  const { client, rows, ready, startError } = useMarketRows();
  const { exchanges, error } = useExchangeListings(client);
  const builders = (exchanges ?? []).filter((e) => e.dex !== MAIN_DEX && e.live > 0);
  const totals = useTotalCaps(
    client,
    builders.map((e) => e.dex)
  );
  if (!client) return null;
  if (startError || error)
    return (
      <p style={{ color: 'var(--destructive)' }}>
        Could not reach Hyperliquid: {startError || error}
      </p>
    );
  if (!ready || !exchanges)
    return (
      <p style={{ color: 'var(--muted-foreground)' }}>Waiting for Hyperliquid&apos;s live data…</p>
    );

  const venues = exchanges.filter((e) => e.live > 0);
  const summaries = new Map(exchangeSummaries(exchanges, rows, totals.caps).map((s) => [s.dex, s]));
  const board = fundingBoard(rows, client.universe.dexes);
  const quality = venueQuality(board);
  const { shared, nameOnly } = sharedAssets(rows);
  const listed = (dex: string) =>
    exchanges.find((e) => e.dex === dex)?.markets.filter((m) => !m.delisted) ?? [];
  const boardOf = (dex: string) => board.filter((r) => r.venue === dex);
  const xyzShare = summaries.get('xyz')?.builderShare;

  type Line = [label: string, cell: (dex: string) => ReactNode, title?: string];
  const sections: [string, Line[]][] = [
    [
      'Size',
      [
        ['Live markets', (d) => summaries.get(d)?.live],
        ['Delisted', (d) => summaries.get(d)?.delisted],
        ['Open interest', (d) => usdCompact(summaries.get(d)?.oiUsd ?? null)],
        [
          'Of builder OI',
          (d) => (d === MAIN_DEX ? MISSING : pct(summaries.get(d)?.builderShare ?? null, 1)),
        ],
        ['Volume 24 h', (d) => usdCompact(summaries.get(d)?.volume24h ?? null)],
        [
          'Exchange cap',
          (d) =>
            d === MAIN_DEX ? 'not published' : usdCompact(summaries.get(d)?.totalCapUsd ?? null),
        ],
        ['Cap use', (d) => pct(summaries.get(d)?.capUse ?? null, 1)],
      ],
    ],
    [
      'Trading now',
      [
        [
          'Median impact spread',
          (d) => {
            const q = quality.get(d)?.medianImpactSpreadBps;
            return q == null ? MISSING : `${q.toFixed(1)} bp`;
          },
          'Round trip at the size Hyperliquid measures; builder exchanges do not publish their size',
        ],
        [
          'Median mark − oracle gap',
          (d) => {
            const q = quality.get(d)?.medianAbsBasisBps;
            return q == null ? MISSING : `${q.toFixed(1)} bp`;
          },
          'How far the mark price sits from the oracle price, typical market',
        ],
        ['At base funding rate', (d) => pct(quality.get(d)?.atBaseShare ?? null, 0)],
        [
          'Isolated margin only',
          (d) => {
            const l = listed(d);
            return l.length
              ? pct(l.filter((m) => m.margin !== 'cross').length / l.length, 0)
              : MISSING;
          },
        ],
        [
          'Max leverage',
          (d) => {
            const l = listed(d).map((m) => m.maxLeverage);
            return l.length ? `${Math.min(...l)}× to ${Math.max(...l)}×` : MISSING;
          },
        ],
      ],
    ],
    [
      'Settings',
      [
        [
          'Funding multiplier',
          (d) => counted(boardOf(d).map((r) => r.params.multiplier)),
          'Value (number of markets)',
        ],
        [
          'Own interest rate',
          (d) =>
            d === MAIN_DEX
              ? MISSING
              : boardOf(d).filter((r) => r.params.documented.interest).length,
          'Markets where the exchange set its own funding interest rate',
        ],
        ['Growth mode', (d) => (d === MAIN_DEX ? MISSING : summaries.get(d)?.growthModeLive)],
        [
          'Fee scale',
          (d) => (d === MAIN_DEX ? MISSING : counted(listed(d).map((m) => m.feeScale ?? MISSING))),
        ],
        [
          'Deployer',
          (d) =>
            d === MAIN_DEX ? (
              MISSING
            ) : (
              <span style={{ fontFamily: 'ui-monospace, monospace' }}>
                {shortAddress(summaries.get(d)?.deployer ?? null)}
              </span>
            ),
        ],
      ],
    ],
    [
      'Shared assets',
      [
        [
          'Also listed elsewhere',
          (d) => shared.filter((s) => s.markets.some((m) => m.venue === d)).length,
          'Assets this exchange shares with another exchange (table below)',
        ],
      ],
    ],
  ];

  const td = {
    padding: '0.2rem 0.7rem',
    textAlign: 'right' as const,
    whiteSpace: 'nowrap' as const,
  };
  return (
    <>
      {xyzShare != null && (
        <p style={{ maxWidth: '50rem' }}>
          For scale: xyz holds <b>{pct(xyzShare, 1)}</b> of all builder-exchange open interest, so
          this is mostly one large builder exchange next to small ones.
        </p>
      )}
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
              <th style={{ ...td, textAlign: 'left' }} />
              {venues.map((e) => (
                <th key={e.dex} style={{ ...td, borderBottom: '1px solid var(--border)' }}>
                  <Link href={exchangePath(e.dex)}>{e.dex === MAIN_DEX ? 'main' : e.dex}</Link>
                  {e.dex === MAIN_DEX && (
                    <div
                      style={{
                        fontWeight: 400,
                        fontSize: '0.8em',
                        color: 'var(--muted-foreground)',
                      }}
                    >
                      reference
                    </div>
                  )}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {sections.map(([section, lines]) => [
              <tr key={section}>
                <td
                  colSpan={venues.length + 1}
                  style={{ ...td, textAlign: 'left', fontWeight: 600, paddingTop: '0.7rem' }}
                >
                  {section}
                </td>
              </tr>,
              ...lines.map(([label, cell, title]) => (
                <tr key={label} style={{ borderBottom: '1px solid var(--border)' }}>
                  <td style={{ ...td, textAlign: 'left' }} title={title}>
                    {label}
                  </td>
                  {venues.map((e) => (
                    <td key={e.dex} style={td}>
                      {cell(e.dex) ?? MISSING}
                    </td>
                  ))}
                </tr>
              )),
            ])}
          </tbody>
        </table>
      </div>
      <p style={{ fontSize: '0.8em', color: 'var(--muted-foreground)', maxWidth: '50rem' }}>
        Exchanges with live markets; {exchanges.length - venues.length} more have none left (see{' '}
        <Link href="/exchanges/">exchanges</Link>). Medians over each exchange&apos;s live markets,
        so one odd market does not decide the figure. The impact spread is measured at $20,000 or
        $6,000 on the main exchange and at a size builder exchanges do not publish, so the
        comparison is close, not exact. Cap use is one-sided open interest against the
        exchange&apos;s cap, as on <Link href="/open-interest/">open interest</Link>.
      </p>

      <h2>The same asset on several exchanges</h2>
      {!shared.length ? (
        <p>No asset is listed on more than one exchange at matching prices right now.</p>
      ) : (
        <div {...tableBox()}>
          <table
            style={{
              borderCollapse: 'collapse',
              fontSize: '0.88em',
              fontVariantNumeric: 'tabular-nums',
            }}
          >
            <thead>
              <tr>
                {[
                  'Asset',
                  'Exchange',
                  'Price',
                  'Gap',
                  'Open interest',
                  'Volume 24 h',
                  'Impact spread',
                  'Funding / year',
                ].map((h, i) => (
                  <th
                    key={h}
                    style={{
                      ...td,
                      textAlign: i < 2 ? 'left' : 'right',
                      borderBottom: '1px solid var(--border)',
                    }}
                  >
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {shared.map((s) =>
                s.markets.map((m, i) => (
                  <tr
                    key={m.key}
                    style={{
                      borderBottom:
                        i === s.markets.length - 1 ? '1px solid var(--border)' : undefined,
                    }}
                  >
                    <td style={{ ...td, textAlign: 'left', fontWeight: 600 }}>
                      {i === 0 ? s.base : ''}
                    </td>
                    <td style={{ ...td, textAlign: 'left' }}>
                      <Link href={m.href}>{siblingVenue(m)}</Link>
                    </td>
                    <td style={td}>{price(m.markPx)}</td>
                    <td style={td}>
                      {i === 0
                        ? 'largest'
                        : `${(((m.markPx - s.markets[0].markPx) / s.markets[0].markPx) * 10_000).toFixed(1)} bp`}
                    </td>
                    <td style={td}>{usdCompact(m.oiUsd)}</td>
                    <td style={td}>{usdCompact(m.volume24h)}</td>
                    <td style={td}>
                      {m.impactSpreadBps === null ? MISSING : `${m.impactSpreadBps.toFixed(1)} bp`}
                    </td>
                    <td style={td}>
                      {m.fundingHourly === null
                        ? MISSING
                        : pctSigned(m.fundingHourly * HOURS_PER_YEAR, 1)}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      )}
      <p style={{ fontSize: '0.8em', color: 'var(--muted-foreground)', maxWidth: '50rem' }}>
        {shared.length} assets, matched as on the market pages: the same name and a price within 2%
        of the market with the most open interest under that name (&quot;largest&quot;, gap in basis
        points against it). Live perps only; names that differ (UBTC on spot, BTC perp) are not
        matched.
        {nameOnly.length > 0 && (
          <>
            {' '}
            Same name, different asset (prices more than 2% apart):{' '}
            {nameOnly.map((n, i) => (
              <span key={n.base}>
                {i ? '; ' : ''}
                {n.base}: {n.markets.map((m) => `${siblingVenue(m)} ${price(m.markPx)}`).join(', ')}
              </span>
            ))}
            .
          </>
        )}
      </p>
    </>
  );
}
