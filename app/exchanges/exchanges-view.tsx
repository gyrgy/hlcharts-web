'use client';
/**
 * `/exchanges`, live (plan §3.3): the main exchange and every builder exchange
 * in perpDexs, with live and delisted markets, open interest, volume, share of
 * builder-exchange open interest, exchange-wide cap use and the deployer.
 */
import Link from 'next/link';
import { exchangeSummaries } from '@/lib/exchanges/exchange-summaries';
import { useExchangeListings } from '@/lib/exchanges/use-exchange-listings';
import { useTotalCaps } from '@/lib/exchanges/use-total-caps';
import { MISSING, pct, shortAddress, usdCompact } from '@/lib/format/format';
import { MAIN_DEX } from '@/lib/hl/constants';
import { useMarketRows } from '@/lib/markets/use-market-rows';
import { NEAR_CAP } from '@/lib/oi/near-cap';
import { tableBox } from '../components/table-box';

export function ExchangesView() {
  const { client, rows, ready } = useMarketRows();
  const { exchanges, error } = useExchangeListings(client);
  const liveBuilders = (exchanges ?? []).filter((e) => e.dex !== MAIN_DEX && e.live > 0);
  const totals = useTotalCaps(
    client,
    liveBuilders.map((e) => e.dex)
  );
  if (!client) return null;
  if (!exchanges) {
    return error ? (
      <p style={{ color: 'var(--destructive)' }}>
        Could not load Hyperliquid&apos;s exchange lists: {error}
      </p>
    ) : (
      <p style={{ color: 'var(--muted-foreground)' }}>Loading the exchange lists…</p>
    );
  }
  const summaries = exchangeSummaries(exchanges, ready ? rows : [], totals.caps);
  const td = {
    padding: '0.2rem 0.6rem',
    textAlign: 'right' as const,
    whiteSpace: 'nowrap' as const,
  };
  const headers = [
    'Exchange',
    'Live',
    'Delisted',
    'Open interest',
    'Of builder OI',
    'Volume 24 h',
    'Exchange cap',
    'Cap use',
    'At or near cap',
    'Growth mode',
    'Deployer',
  ];
  return (
    <>
      {!ready && (
        <p style={{ color: 'var(--muted-foreground)' }}>
          Waiting for Hyperliquid&apos;s live figures…
        </p>
      )}
      {totals.error && (
        <p style={{ color: 'var(--warning)' }}>Some exchange caps did not load: {totals.error}</p>
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
              {headers.map((h, i) => (
                <th
                  key={h}
                  style={{
                    ...td,
                    textAlign: i ? 'right' : 'left',
                    borderBottom: '1px solid var(--border)',
                  }}
                >
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {summaries.map((s) => {
              const main = s.dex === MAIN_DEX;
              return (
                <tr
                  key={s.dex}
                  style={{
                    borderBottom: '1px solid var(--border)',
                    color: s.live ? undefined : 'var(--muted-foreground)',
                  }}
                >
                  <td style={{ ...td, textAlign: 'left' }}>
                    <Link href={s.href} style={{ color: 'inherit' }}>
                      {main ? 'Main exchange' : s.dex}
                    </Link>
                    {s.fullName ? (
                      <span style={{ color: 'var(--muted-foreground)' }}> {s.fullName}</span>
                    ) : null}
                  </td>
                  <td style={td}>{s.live}</td>
                  <td style={td}>{s.delisted}</td>
                  <td style={td}>{ready ? usdCompact(s.oiUsd) : MISSING}</td>
                  <td style={td}>
                    {ready && s.builderShare !== null ? pct(s.builderShare, 1) : MISSING}
                  </td>
                  <td style={td}>{ready ? usdCompact(s.volume24h) : MISSING}</td>
                  <td style={td}>{main ? 'not published' : usdCompact(s.totalCapUsd)}</td>
                  <td style={td}>{ready && s.capUse !== null ? pct(s.capUse, 1) : MISSING}</td>
                  <td style={td}>{ready ? s.atOrNearCap : MISSING}</td>
                  <td style={td}>{main ? MISSING : s.growthModeLive}</td>
                  <td
                    style={{ ...td, textAlign: 'left', fontFamily: 'ui-monospace, monospace' }}
                    title={s.deployer ?? ''}
                  >
                    {main ? MISSING : shortAddress(s.deployer)}
                    {s.sharesDeployerWith.length > 0 && (
                      <span style={{ fontFamily: 'inherit', color: 'var(--muted-foreground)' }}>
                        {' '}
                        also {s.sharesDeployerWith.join(', ')}
                      </span>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      <div style={{ fontSize: '0.8em', color: 'var(--muted-foreground)', maxWidth: '50rem' }}>
        <p>
          Figures are summed over each exchange&apos;s live markets. <b>Of builder OI</b>: share of
          all builder-exchange open interest. <b>Exchange cap</b>: the cap a builder exchange sets
          on its total open interest, in dollars; <b>cap use</b> is its open interest (one side, as
          Hyperliquid reports it) against that cap, our reading of live data as on{' '}
          <Link href="/open-interest/">open interest</Link>. Caps are shown for exchanges with live
          markets. <b>At or near cap</b>: on the main exchange, markets Hyperliquid lists at their
          cap; on builder exchanges, markets at {pct(NEAR_CAP, 0)} or more of their own cap.{' '}
          <b>Growth mode</b>: live markets with it on (a fee setting; see{' '}
          <Link href="/listings/">listings</Link>).
        </p>
        <p>
          <b>Deployer</b>: the address that created the exchange; &quot;also&quot; names other
          exchanges created by the same address. Addresses are Hyperliquid&apos;s public data; we do
          not link them to anyone.
        </p>
      </div>
    </>
  );
}
