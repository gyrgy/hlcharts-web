'use client';
/**
 * A perp's live figures (plan §3.3, market page header): price every second,
 * the contexts about every 15 s, the cap from the exchange's list, and the
 * time to the next hourly funding payment.
 */
import { INFO, MAIN_DEX } from '@/lib/hl/constants';
import { ago, MISSING, pct, pctSigned, price, usdCompact } from '@/lib/format/format';
import { useLiveClient } from '@/lib/live/use-live-client';
import { usePolledInfo } from '@/lib/live/use-polled-info';

const AT_CAP_POLL_MS = 60_000;
const HOUR_MS = 3_600_000;

export function PerpLiveHeader({ coin, dex }: { coin: string; dex: string }) {
  const { client, startError } = useLiveClient();
  const atCap = usePolledInfo<string[]>(
    dex === MAIN_DEX ? client : null,
    { type: INFO.perpsAtOpenInterestCap },
    AT_CAP_POLL_MS
  );
  if (!client) return null;
  if (startError)
    return <p style={{ color: 'var(--destructive)' }}>Could not reach Hyperliquid: {startError}</p>;
  const row = client.store.perp(coin);
  const state = client.store.dexState.get(dex);
  if (!row) {
    const why =
      !client.universe.loaded || state === 'pending' || state === undefined
        ? 'Waiting for live data…'
        : state === 'unavailable'
          ? "Hyperliquid's live data for this exchange did not match its market list, so it is not shown."
          : 'No live figures for this market.';
    return (
      <p style={{ color: 'var(--muted-foreground)' }}>
        {client.universe.liveDexes().includes(dex)
          ? why
          : 'This exchange has no live markets: no live figures.'}
      </p>
    );
  }
  const { ctx } = row;
  const now = Date.now();
  const mark = Number(client.store.tick(coin)?.markPx ?? ctx.markPx);
  const prev = Number(ctx.prevDayPx);
  const oiCoins = Number(ctx.openInterest);
  const funding = Number(ctx.funding);
  const capEntry = client.universe.dexes.get(dex)?.assetToStreamingOiCap.find(([c]) => c === coin);
  const cap = capEntry ? Number(capEntry[1]) : null;
  const nextFunding = Math.ceil(now / HOUR_MS) * HOUR_MS;
  const toNext = nextFunding - now;

  const items: [string, string, string?][] = [
    ['Price', price(mark), 'Mark price'],
    ['24 h', prev > 0 ? pctSigned(mark / prev - 1) : MISSING],
    ['Oracle', price(Number(ctx.oraclePx))],
    ['Mid', price(ctx.midPx === null ? null : Number(ctx.midPx))],
    ['Volume 24 h', usdCompact(Number(ctx.dayNtlVlm))],
    [
      'Open interest',
      `${usdCompact(oiCoins * mark)} (${oiCoins.toLocaleString('en-US')} contracts)`,
    ],
    [
      'Funding',
      `${pctSigned(funding, 4)}/h · ${pctSigned(funding * 24 * 365, 1)}/yr`,
      'Hourly rate; positive: longs pay shorts. Annualised as the hourly rate × 24 × 365, not compounded',
    ],
    [
      'Next payment',
      `in ${Math.floor(toNext / 60_000)}:${String(Math.floor((toNext % 60_000) / 1000)).padStart(2, '0')}`,
      'Funding is paid every hour, on the hour',
    ],
    [
      'Premium now',
      ctx.premium === null ? MISSING : pctSigned(Number(ctx.premium), 4),
      "The premium right now, not the hour's average that funding uses",
    ],
    dex === MAIN_DEX
      ? [
          'Open-interest cap',
          atCap.data
            ? atCap.data.includes(coin)
              ? 'at cap: no new positions'
              : 'below cap'
            : MISSING,
        ]
      : [
          'Cap use',
          cap
            ? `${pct((oiCoins * mark) / cap)} of ${usdCompact(cap)} · ${
                cap >= oiCoins * mark
                  ? `${usdCompact(cap - oiCoins * mark)} headroom`
                  : `over by ${usdCompact(oiCoins * mark - cap)}`
              }`
            : MISSING,
          "Open interest as a share of the market's cap on this exchange",
        ],
  ];
  return (
    <>
      <dl
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fill, minmax(11rem, 1fr))',
          gap: '0.6rem 1.5rem',
          margin: '1rem 0',
        }}
      >
        {items.map(([label, value, title]) => (
          <div key={label} title={title}>
            <dt style={{ fontSize: '0.8em', color: 'var(--muted-foreground)' }}>{label}</dt>
            <dd style={{ margin: 0, fontWeight: 600, fontVariantNumeric: 'tabular-nums' }}>
              {value}
            </dd>
          </div>
        ))}
      </dl>
      <p style={{ fontSize: '0.8em', color: 'var(--muted-foreground)' }}>
        Figures from {ago(now - row.ctxAt)} ago; price{' '}
        {client.store.tick(coin) ? 'live' : 'from the same update'}.
      </p>
    </>
  );
}
