'use client';
/**
 * "Funding explained" (plan §3.3): the current rate taken apart by
 * Hyperliquid's formula, with the market's own parameters, the premium right
 * now (labelled as not the hour's average), the size the premium is measured
 * at, and (main exchange) the next predicted rate against Binance and Bybit.
 */
import { FUNDING_VENUE, INFO, MAIN_DEX } from '@/lib/hl/constants';
import { PredictedFundings } from '@/lib/hl/types';
import { explainFunding } from '@/lib/funding/explain-funding';
import { fundingParams } from '@/lib/funding/funding-params';
import { MISSING, pctSigned } from '@/lib/format/format';
import { useLiveClient } from '@/lib/live/use-live-client';
import { usePolledInfo } from '@/lib/live/use-polled-info';
import { impactNotionalUsd } from '@/lib/book/impact-notional';

const PREDICTED_POLL_MS = 60_000;

const pct = (x: number, digits: number): string => `${(x * 100).toFixed(digits)}%`;

export function FundingExplained({ coin, dex }: { coin: string; dex: string }) {
  const { client } = useLiveClient();
  const predicted = usePolledInfo<PredictedFundings>(
    dex === MAIN_DEX ? client : null,
    { type: INFO.predictedFundings },
    PREDICTED_POLL_MS
  );
  if (!client) return null;
  const row = client.store.perp(coin);
  if (!row) return <p style={{ color: 'var(--muted-foreground)' }}>Waiting for live data…</p>;
  const d = client.universe.dexes.get(dex);
  const params = fundingParams(dex, coin, {
    interest: d?.assetToFundingInterestRate,
    clamp: d?.assetToFundingClamp,
    multiplier: d?.assetToFundingMultiplier,
  });
  const hourly = Number(row.ctx.funding);
  const e = explainFunding(hourly, params);
  const r = params.interest8h;
  const c = params.clamp8h;
  const m = params.multiplier;
  const inferred = (ok: boolean) =>
    ok ? '' : ' (not published by Hyperliquid; inferred from live rates)';
  const payer = hourly > 0 ? 'longs pay shorts' : hourly < 0 ? 'shorts pay longs' : 'nobody pays';

  let state: string;
  if (e.state === 'band') {
    state = `The hour's average premium is within ±${pct(c, 2)} of the interest rate, so funding equals the interest rate${m !== 1 ? ` × ${m}` : ''}: ${pctSigned(hourly, 5)} an hour.`;
  } else if (e.state === 'above' || e.state === 'below') {
    state = `The clamp is at work: the hour's average premium is ${e.state === 'above' ? 'above' : 'below'} the interest rate by more than ${pct(c, 2)}, and the rate puts that average at ${pctSigned(e.impliedPremium, 4)} of the oracle price.`;
  } else {
    state =
      'This rate cannot come from the formula as Hyperliquid documents it, so no breakdown is shown.';
  }

  let compare: string | null = null;
  if (dex === MAIN_DEX && predicted.data) {
    const entry = predicted.data.find(([c2]) => c2 === coin)?.[1] ?? [];
    const hourlyOf = (venue: string): string => {
      const v = entry.find(([n]) => n === venue)?.[1];
      return v && v.fundingIntervalHours
        ? pctSigned(Number(v.fundingRate) / v.fundingIntervalHours, 4)
        : MISSING;
    };
    compare = `Next predicted, per hour: Hyperliquid ${hourlyOf(FUNDING_VENUE.hyperliquid)}, Binance ${hourlyOf(FUNDING_VENUE.binance)}, Bybit ${hourlyOf(FUNDING_VENUE.bybit)} (their 4- or 8-hour rates divided by their interval).`;
  }

  const notional = impactNotionalUsd(dex, coin);
  const impact =
    notional === null
      ? 'not published for builder exchanges'
      : `$${notional.toLocaleString('en-US')}`;

  return (
    <section style={{ maxWidth: '50rem' }}>
      <p>
        <b>{pctSigned(hourly, 5)} an hour</b> ({pctSigned(hourly * 8, 4)} per 8 hours); {payer}, at
        the top of every hour.
      </p>
      {e.state !== 'unexplained' && (
        <>
          <p
            style={{
              fontFamily: 'ui-monospace, monospace',
              fontSize: '0.9em',
              background: 'var(--muted)',
              padding: '0.5rem',
            }}
          >
            rate (8 h) = {m !== 1 ? `${m} × [` : ''}average premium + clamp(interest − average
            premium, ±{pct(c, 2)}){m !== 1 ? ']' : ''}
            <br />
            interest = {pct(r, 5)} per 8 h{inferred(params.documented.interest)}
            {m !== 1 || !params.documented.multiplier ? (
              <>
                <br />
                multiplier = {m}
                {inferred(params.documented.multiplier)}
              </>
            ) : null}
          </p>
          <p>{state}</p>
        </>
      )}
      {e.state === 'unexplained' && <p>{state}</p>}
      <p>
        Premium right now:{' '}
        {row.ctx.premium === null ? MISSING : pctSigned(Number(row.ctx.premium), 4)} (one sample,
        not the hour&apos;s average the rate uses; sampled every 5 seconds).{' '}
        {dex === MAIN_DEX
          ? `The premium compares the prices to buy and sell ${impact} with the oracle price.`
          : "Builder exchanges measure the premium from the midpoint of those prices, without the main exchange's band around the oracle; the size they are measured at is not published."}
      </p>
      {compare && <p>{compare}</p>}
      <p style={{ fontSize: '0.8em', color: 'var(--muted-foreground)' }}>
        Formula and parameters: Hyperliquid&apos;s documentation (funding; contract specifications;
        HIP-3 deployer actions). Funding is capped at 4% an hour.
      </p>
    </section>
  );
}
