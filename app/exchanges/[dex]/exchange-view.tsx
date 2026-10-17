'use client';
/**
 * One exchange, live (plan §3.3, `/exchanges/<dex>`): its totals and cap,
 * who deployed it and which addresses may act for it, its live markets with
 * their share of its open interest, each market's settings, and its delisted
 * markets.
 */
import Link from 'next/link';
import { exchangeSummaries } from '@/lib/exchanges/exchange-summaries';
import { useExchangeListings } from '@/lib/exchanges/use-exchange-listings';
import { useTotalCaps } from '@/lib/exchanges/use-total-caps';
import { MISSING, pct, pctSigned, price, usdCompact } from '@/lib/format/format';
import { fundingParams } from '@/lib/funding/funding-params';
import { MAIN_DEX } from '@/lib/hl/constants';
import { MarginRule } from '@/lib/listings/listings';
import { tiersText } from '@/lib/listings/tiers-text';
import { exchangePath } from '@/lib/markets/market-paths';
import { sortBy } from '@/lib/markets/sort-by';
import { useMarketRows } from '@/lib/markets/use-market-rows';
import { tableBox } from '../../components/table-box';

const HOURS_PER_YEAR = 24 * 365;
const MARGIN_TEXT: Record<MarginRule, string> = {
  cross: 'cross allowed',
  isolated: 'isolated only',
  isolatedLocked: 'isolated, margin locked',
};
/** Addresses: monospace, and free to wrap anywhere so a phone does not scroll sideways for one. */
const mono = {
  fontFamily: 'ui-monospace, monospace',
  fontSize: '0.9em',
  overflowWrap: 'anywhere' as const,
};

export function ExchangeView({ dex }: { dex: string }) {
  const { client, rows, ready } = useMarketRows();
  const { exchanges, dexes, error } = useExchangeListings(client);
  const main = dex === MAIN_DEX;
  const totals = useTotalCaps(client, main ? [] : [dex]);
  if (!client) return null;
  if (!exchanges) {
    return error ? (
      <p style={{ color: 'var(--destructive)' }}>
        Could not load Hyperliquid&apos;s exchange lists: {error}
      </p>
    ) : (
      <p style={{ color: 'var(--muted-foreground)' }}>Loading…</p>
    );
  }
  const listing = exchanges.find((e) => e.dex === dex);
  if (!listing)
    return (
      <p style={{ color: 'var(--destructive)' }}>
        This exchange is no longer in Hyperliquid&apos;s list.
      </p>
    );
  const summary = exchangeSummaries(exchanges, ready ? rows : [], totals.caps).find(
    (s) => s.dex === dex
  )!;
  const identity = dexes?.find((d) => d?.name === dex) ?? null;
  const live = sortBy(
    rows.filter((r) => r.kind === 'perp' && !r.delisted && r.venue === dex),
    (r) => r.oiUsd,
    true
  );
  const settings = new Map(listing.markets.map((m) => [m.key, m]));
  const delisted = listing.markets.filter((m) => m.delisted);
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
  const table = (headers: string[], body: React.ReactNode) => (
    <div {...tableBox('70vh')}>
      <table
        style={{
          borderCollapse: 'collapse',
          fontSize: '0.88em',
          fontVariantNumeric: 'tabular-nums',
        }}
      >
        <thead>
          <tr>
            {headers.map((h, i) => (
              <th key={h} style={{ ...th, textAlign: i ? 'right' : 'left' }}>
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>{body}</tbody>
      </table>
    </div>
  );

  return (
    <>
      <p style={{ maxWidth: '50rem' }}>
        {summary.live} live market{summary.live === 1 ? '' : 's'}, {summary.delisted} delisted.
        {ready && summary.live > 0 && (
          <>
            {' '}
            Open interest <b>{usdCompact(summary.oiUsd)}</b>
            {summary.builderShare !== null && (
              <> ({pct(summary.builderShare, 1)} of all builder exchanges)</>
            )}
            , 24-hour volume <b>{usdCompact(summary.volume24h)}</b>.
          </>
        )}
        {!main && summary.totalCapUsd !== null && (
          <>
            {' '}
            Exchange-wide cap {usdCompact(summary.totalCapUsd)}
            {ready && summary.capUse !== null ? <>, {pct(summary.capUse, 1)} used</> : null}.
          </>
        )}
      </p>

      <h2>Who runs it</h2>
      {main ? (
        <p style={{ maxWidth: '50rem' }}>
          Hyperliquid&apos;s own exchange. Its funding settings are Hyperliquid&apos;s (interest
          0.01% per 8 hours, clamp 0.05%), and it does not publish per-market open-interest caps: it
          lists the markets at their cap instead.
        </p>
      ) : identity ? (
        <div style={{ maxWidth: '50rem' }}>
          <div {...tableBox()}>
            <table style={{ borderCollapse: 'collapse', fontSize: '0.9em' }}>
              <tbody>
                {(
                  [
                    ['Deployer', identity.deployer],
                    ['Oracle updater', identity.oracleUpdater],
                    ['Fee recipient', identity.feeRecipient],
                  ] as const
                ).map(([label, address]) => (
                  <tr key={label}>
                    <td style={{ padding: '0.15rem 0.8rem 0.15rem 0' }}>{label}</td>
                    <td style={mono}>{address ?? 'none set'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {summary.sharesDeployerWith.length > 0 && (
            <p>
              The same address deployed{' '}
              {summary.sharesDeployerWith.map((d, i) => (
                <span key={d}>
                  {i ? ', ' : ''}
                  <Link href={exchangePath(d)}>{d}</Link>
                </span>
              ))}
              .
            </p>
          )}
          <h3 style={{ fontSize: '1em' }}>Sub-deployers</h3>
          {identity.subDeployers?.length ? (
            <div {...tableBox()}>
              <table style={{ borderCollapse: 'collapse', fontSize: '0.9em' }}>
                <tbody>
                  {identity.subDeployers.map(([action, addresses]) => (
                    <tr key={action}>
                      <td style={{ padding: '0.15rem 0.8rem 0.15rem 0', verticalAlign: 'top' }}>
                        <code>{action}</code>
                      </td>
                      <td style={mono}>
                        {addresses.map((a) => (
                          <div key={a}>{a}</div>
                        ))}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <p>None: only the deployer acts for this exchange.</p>
          )}
          <p style={{ fontSize: '0.8em', color: 'var(--muted-foreground)' }}>
            Sub-deployers are addresses the deployer allows to take one action each (list a market,
            update prices, halt trading, set caps and the like). Addresses are Hyperliquid&apos;s
            public data; we do not link them to anyone.
          </p>
        </div>
      ) : (
        <p style={{ color: 'var(--muted-foreground)' }}>Loading…</p>
      )}

      <h2>Live markets</h2>
      {!ready ? (
        <p style={{ color: 'var(--muted-foreground)' }}>
          Waiting for Hyperliquid&apos;s live figures…
        </p>
      ) : !live.length ? (
        <p>None: every market on this exchange has been delisted.</p>
      ) : (
        table(
          [
            'Market',
            'Price',
            '24 h',
            'Volume 24 h',
            'Open interest',
            'Of exchange',
            main ? 'At cap' : 'Cap',
            ...(main ? [] : ['Cap use']),
            'Funding / year',
          ],
          live.map((r) => (
            <tr key={r.key} style={{ borderBottom: '1px solid var(--border)' }}>
              <td style={{ ...td, textAlign: 'left' }}>
                <Link href={r.href}>{r.name}</Link>
              </td>
              <td style={td}>{price(r.markPx)}</td>
              <td style={td}>{pctSigned(r.change24h)}</td>
              <td style={td}>{usdCompact(r.volume24h)}</td>
              <td style={td}>{usdCompact(r.oiUsd)}</td>
              <td style={td}>
                {summary.oiUsd > 0 ? pct((r.oiUsd ?? 0) / summary.oiUsd, 1) : MISSING}
              </td>
              {main ? (
                <td style={td}>{r.atCap ? 'at cap' : ''}</td>
              ) : (
                <>
                  <td style={td}>
                    {r.capUse && r.oiUsd ? usdCompact(r.oiUsd / r.capUse) : MISSING}
                  </td>
                  <td style={td}>{r.capUse === null ? MISSING : pct(r.capUse, 1)}</td>
                </>
              )}
              <td style={td}>
                {r.fundingHourly === null
                  ? MISSING
                  : pctSigned(r.fundingHourly * HOURS_PER_YEAR, 1)}
              </td>
            </tr>
          ))
        )
      )}

      <h2>Settings</h2>
      {table(
        main
          ? ['Market', 'Leverage', 'Margin']
          : [
              'Market',
              'Leverage',
              'Margin',
              'Funding ×',
              'Interest / 8 h',
              'Clamp / 8 h',
              'Growth mode',
              'Fee scale',
              'Fee scale set',
            ],
        listing.markets
          .filter((m) => !m.delisted)
          .map((m) => {
            const f = main
              ? null
              : fundingParams(dex, m.key, {
                  interest: identity?.assetToFundingInterestRate,
                  clamp: identity?.assetToFundingClamp,
                  multiplier: identity?.assetToFundingMultiplier,
                });
            const mark = (documented: boolean): string => (documented ? '' : '*');
            return (
              <tr key={m.key} style={{ borderBottom: '1px solid var(--border)' }}>
                <td style={{ ...td, textAlign: 'left' }}>
                  <Link href={m.href}>{m.name}</Link>
                </td>
                <td style={td}>{tiersText(settings.get(m.key)?.tiers ?? m.tiers)}</td>
                <td style={td}>{MARGIN_TEXT[m.margin]}</td>
                {f && (
                  <>
                    <td style={td}>
                      {f.multiplier}
                      {mark(f.documented.multiplier)}
                    </td>
                    <td style={td}>
                      {pct(f.interest8h, 4)}
                      {mark(f.documented.interest)}
                    </td>
                    <td style={td}>{pct(f.clamp8h, 3)}</td>
                    <td style={td}>{m.growthMode ? 'on' : ''}</td>
                    <td style={td}>{m.feeScale ?? MISSING}</td>
                    <td style={td}>
                      {m.feeScaleChangedAt
                        ? new Date(m.feeScaleChangedAt).toISOString().slice(0, 10)
                        : ''}
                    </td>
                  </>
                )}
              </tr>
            );
          })
      )}
      {!main && (
        <p style={{ fontSize: '0.8em', color: 'var(--muted-foreground)', maxWidth: '50rem' }}>
          Funding settings scale and shape this exchange&apos;s funding (see{' '}
          <Link href="/funding/">funding</Link>); * marks a default the exchange has not set, where
          Hyperliquid documents the clamp&apos;s (0.03%) but not the interest rate&apos;s or the
          multiplier&apos;s, which are inferred from live rates. Growth mode and fee scale are fee
          settings, shown as set (see <Link href="/listings/">listings</Link>).
        </p>
      )}

      {delisted.length > 0 && (
        <>
          <h2>Delisted</h2>
          <p style={{ maxWidth: '50rem', lineHeight: 1.8 }}>
            {delisted.map((m, i) => (
              <span key={m.key}>
                {i ? ' · ' : ''}
                <Link href={m.href} style={{ color: 'var(--muted-foreground)' }}>
                  {m.name}
                </Link>
              </span>
            ))}
          </p>
        </>
      )}
    </>
  );
}
