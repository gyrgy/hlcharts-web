'use client';
/**
 * `/listings`, live (plan §3.3): every perp on every exchange, delisted ones
 * included, with margin rules, leverage tiers and fee settings; the markets
 * Hyperliquid lists at their open-interest cap; and the perp listing auction.
 * Lists refresh every 5 minutes.
 */
import Link from 'next/link';
import { MISSING } from '@/lib/format/format';
import { INFO, MAIN_DEX } from '@/lib/hl/constants';
import { PerpDeployAuctionStatus, PerpDex, PerpMetaWithCollateral } from '@/lib/hl/types';
import { auctionView } from '@/lib/listings/auction-view';
import { ExchangeListing, listings, MarginRule } from '@/lib/listings/listings';
import { tiersText } from '@/lib/listings/tiers-text';
import { useLiveClient } from '@/lib/live/use-live-client';
import { usePolledInfo } from '@/lib/live/use-polled-info';
import { tableBox } from '../components/table-box';

/** Plan §3.3: listings change rarely. */
const LISTINGS_POLL_MS = 5 * 60_000;

const MARGIN_TEXT: Record<MarginRule, string> = {
  cross: 'cross allowed',
  isolated: 'isolated only',
  isolatedLocked: 'isolated, margin locked',
};
const utc = (ms: number): string =>
  `${new Date(ms).toISOString().slice(0, 16).replace('T', ' ')} UTC`;
const hype = (x: number): string =>
  `${x.toLocaleString('en-US', { maximumFractionDigits: 1 })} HYPE`;
const duration = (ms: number): string => {
  const m = Math.max(0, Math.round(ms / 60_000));
  return m >= 60 ? `${Math.floor(m / 60)} h ${m % 60} min` : `${m} min`;
};

function Exchange({ e }: { e: ExchangeListing }) {
  const main = e.dex === MAIN_DEX;
  const td = { padding: '0.15rem 0.6rem', whiteSpace: 'nowrap' as const };
  const headers = main
    ? ['Market', 'Status', 'Leverage', 'Margin', 'At cap']
    : ['Market', 'Status', 'Leverage', 'Margin', 'Growth mode', 'Fee scale', 'Fee scale set'];
  return (
    <details open={e.live > 0} style={{ margin: '0.6rem 0' }}>
      <summary style={{ cursor: 'pointer' }}>
        <b>{main ? 'Main exchange' : e.dex}</b>
        {e.fullName ? ` (${e.fullName})` : ''}: {e.live} live, {e.delisted} delisted
      </summary>
      <div {...tableBox('60vh')}>
        <table style={{ borderCollapse: 'collapse', fontSize: '0.88em' }}>
          <thead>
            <tr>
              {headers.map((h) => (
                <th
                  key={h}
                  style={{
                    ...td,
                    textAlign: 'left',
                    borderBottom: '1px solid var(--border)',
                    position: 'sticky',
                    top: 0,
                    background: 'var(--background)',
                  }}
                >
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {e.markets.map((m) => (
              <tr key={m.key} style={{ color: m.delisted ? 'var(--muted-foreground)' : undefined }}>
                <td style={td}>
                  <Link href={m.href} style={{ color: 'inherit' }}>
                    {m.name}
                  </Link>
                </td>
                <td style={td}>{m.delisted ? 'delisted' : 'live'}</td>
                <td style={td}>{tiersText(m.tiers)}</td>
                <td style={td}>{MARGIN_TEXT[m.margin]}</td>
                {main ? (
                  <td style={td}>{m.atCap ? 'at cap' : ''}</td>
                ) : (
                  <>
                    <td style={td}>{m.growthMode ? 'on' : ''}</td>
                    <td style={td}>{m.feeScale === null ? MISSING : m.feeScale}</td>
                    <td style={td}>
                      {m.feeScaleChangedAt ? utc(m.feeScaleChangedAt).slice(0, 10) : ''}
                    </td>
                  </>
                )}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </details>
  );
}

export function ListingsView() {
  const { client } = useLiveClient();
  const dexes = usePolledInfo<(PerpDex | null)[]>(
    client,
    { type: INFO.perpDexs },
    LISTINGS_POLL_MS
  );
  const metas = usePolledInfo<PerpMetaWithCollateral[]>(
    client,
    { type: INFO.allPerpMetas },
    LISTINGS_POLL_MS
  );
  const atCap = usePolledInfo<string[]>(
    client,
    { type: INFO.perpsAtOpenInterestCap },
    LISTINGS_POLL_MS
  );
  const auction = usePolledInfo<PerpDeployAuctionStatus>(
    client,
    { type: INFO.perpDeployAuctionStatus },
    LISTINGS_POLL_MS
  );
  if (!client) return null;
  const error = dexes.error || metas.error;
  if (!dexes.data || !metas.data) {
    return error ? (
      <p style={{ color: 'var(--destructive)' }}>
        Could not load Hyperliquid&apos;s market lists: {error}
      </p>
    ) : (
      <p style={{ color: 'var(--muted-foreground)' }}>Loading the market lists…</p>
    );
  }

  let exchanges: ExchangeListing[];
  try {
    exchanges = listings(dexes.data, metas.data, new Set(atCap.data ?? []));
  } catch (e) {
    return (
      <p style={{ color: 'var(--destructive)' }}>
        Hyperliquid&apos;s lists did not line up: {String(e)}
      </p>
    );
  }
  const now = Date.now();
  const a = auction.data ? auctionView(auction.data, now) : null;
  const atCapDelisted =
    (atCap.data ?? []).length - exchanges[0].markets.filter((m) => m.atCap).length;
  const td = { padding: '0.2rem 0.6rem', textAlign: 'right' as const };
  const live = (e: ExchangeListing) => e.markets.filter((m) => !m.delisted);

  return (
    <>
      <h2>Exchanges</h2>
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
              {['Exchange', 'Live', 'Delisted', 'Isolated only', 'Growth mode'].map((h, i) => (
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
            {exchanges.map((e) => (
              <tr
                key={e.dex}
                style={{
                  borderBottom: '1px solid var(--border)',
                  color: e.live ? undefined : 'var(--muted-foreground)',
                }}
              >
                <td style={{ ...td, textAlign: 'left' }}>
                  {e.dex === MAIN_DEX ? 'Main exchange' : e.dex}
                  {e.fullName ? (
                    <span style={{ color: 'var(--muted-foreground)' }}> {e.fullName}</span>
                  ) : null}
                </td>
                <td style={td}>{e.live}</td>
                <td style={td}>{e.delisted}</td>
                <td style={td}>{live(e).filter((m) => m.margin !== 'cross').length}</td>
                <td style={td}>
                  {e.dex === MAIN_DEX ? MISSING : live(e).filter((m) => m.growthMode).length}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p style={{ fontSize: '0.8em', color: 'var(--muted-foreground)', maxWidth: '50rem' }}>
        Counts of live markets except Delisted. Exchanges whose markets are all delisted stay
        listed: Hyperliquid keeps them, and so do their pages.
      </p>

      <h2>Listing auction</h2>
      {!a ? (
        <p style={{ color: 'var(--muted-foreground)' }}>
          {auction.error ? `Could not load the auction: ${auction.error}` : 'Loading…'}
        </p>
      ) : (
        <div style={{ maxWidth: '50rem' }}>
          {a.state === 'sold' && (
            <p>
              Sold at <b>{hype(a.soldAt ?? 0)}</b>. The auction started {utc(a.startMs)}.
            </p>
          )}
          {a.state === 'ended' && (
            <p>Ended {utc(a.endMs)} without a buyer; Hyperliquid has not shown the next one yet.</p>
          )}
          {a.state === 'running' && (
            <p>
              Running: <b>{a.onLine ? `about ${hype(a.linePrice)}` : hype(a.currentGas)}</b> now,
              down from {hype(a.startGas)} at {utc(a.startMs)}, falling to {hype(a.floorGas)} at{' '}
              {utc(a.endMs)} ({duration(a.endMs - now)} left). Hyperliquid&apos;s own figure at the
              last refresh: {hype(a.currentGas)}.
            </p>
          )}
          <p style={{ fontSize: '0.85em', color: 'var(--muted-foreground)' }}>
            {a.onLine || a.state !== 'running'
              ? `A Dutch auction for the right to list one more perp, shared by all builder exchanges: the price, in HYPE, falls in a straight line for 31 hours to ${hype(a.floorGas)}; the first to pay it gets the listing. Each auction starts at twice the last sale price, or at ${hype(a.floorGas)} if the last one found no buyer (Hyperliquid's documentation, HIP-1 and HIP-3).`
              : "Hyperliquid's price is not where its documented rule (a straight fall to 500 HYPE over 31 hours) puts it, so it is shown as reported, without the explanation."}
          </p>
        </div>
      )}

      <h2>Every market</h2>
      {exchanges.map((e) => (
        <Exchange key={e.dex} e={e} />
      ))}
      <div style={{ fontSize: '0.8em', color: 'var(--muted-foreground)', maxWidth: '50rem' }}>
        <p>
          Markets are in Hyperliquid&apos;s own order. <b>Leverage</b>: the most a position may use,
          lower for larger positions where the market has tiers (position value in USDC, from
          Hyperliquid&apos;s margin tiers). <b>Margin</b>: &quot;isolated only&quot; means a
          position cannot share margin with others; &quot;margin locked&quot; means, in addition,
          margin cannot be taken out of an open position.
        </p>
        <p>
          <b>At cap</b>: on the main exchange, the markets Hyperliquid lists at their open-interest
          cap
          {atCapDelisted > 0
            ? `; its list also holds ${atCapDelisted} delisted market${atCapDelisted > 1 ? 's' : ''}, not marked here`
            : ''}
          . Builder exchanges&apos; caps and how full they are:{' '}
          <Link href="/open-interest/">open interest</Link>.
        </p>
        <p>
          <b>Growth mode</b> and <b>fee scale</b> are fee settings each builder exchange chooses per
          market (the scale sets the deployer&apos;s share of fees). Hyperliquid&apos;s two
          documentation pages describe growth mode&apos;s effect on that range differently, so the
          settings are shown as they are, without a reading of what they cost a trader.
        </p>
        <p>
          Spot: {client.universe.spot.length} pairs listed; their figures are on{' '}
          <Link href="/markets/">Markets → Spot</Link>.
        </p>
      </div>
    </>
  );
}
