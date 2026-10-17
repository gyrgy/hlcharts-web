import type { Metadata } from 'next';
import { breadcrumbList } from '@/lib/seo/breadcrumbs';
import { pageMetadata } from '@/lib/seo/page-metadata';
import { JsonLd } from '../components/json-ld';
import Link from 'next/link';
import { buildMarkets } from '@/lib/build/build-markets';
import { perpSettings } from '@/lib/static/perp-settings';
import { clampText, exchangeText, interestText, multiplierText } from '@/lib/static/settings-text';
import { NoJs } from '../components/no-js';
import { StaticTable } from '../components/static-table';
import { FundingView } from './funding-view';

export const metadata: Metadata = pageMetadata({
  title: 'Hyperliquid funding rates: every perp, live, against Binance and Bybit | hlcharts',
  description:
    "Every Hyperliquid perp's funding rate live, main and builder exchanges: what sets it this hour, the premium against the band, Binance and Bybit side by side, and each builder exchange's funding settings.",
  path: '/funding/',
});

/** The text is written at build time; the numbers load live in the browser. */
export default async function FundingPage() {
  const listed = (await buildMarkets()).perps.map(perpSettings).filter((s) => !s.delisted);
  return (
    <main>
      <JsonLd data={breadcrumbList([{ name: 'Funding', path: '/funding/' }])} />
      <h1>Funding</h1>
      <p style={{ maxWidth: '50rem' }}>
        Funding is an hourly payment between longs and shorts that keeps a perp&apos;s price near
        its oracle price. With no premium, most markets charge longs a small base rate, the interest
        rate; the further the perp trades above the oracle, the more longs pay, and far enough below
        it, shorts pay longs. Every live perp on Hyperliquid&apos;s main exchange and its builder
        exchanges, live. Each market&apos;s page breaks its rate into its parts and shows its
        history.
      </p>
      <FundingView />
      <NoJs live="Each perp's funding rate this hour, what sets it, the premium, Binance's and Bybit's rates, the spread of rates across markets and the history chart are live.">
        <StaticTable
          caption="Funding parameters of every listed perp, per 8 hours (* = a default Hyperliquid does not publish, inferred from live rates)"
          head={['Market', 'Exchange', 'Interest rate', 'Clamp', 'Multiplier']}
          rows={listed.map((s) => [
            <Link key="m" href={s.path}>
              {s.coin}
            </Link>,
            exchangeText(s.dex),
            interestText(s),
            clampText(s),
            multiplierText(s),
          ])}
        />
      </NoJs>
      <p style={{ fontSize: '0.8em', color: 'var(--muted-foreground)' }}>
        Formula and parameters: Hyperliquid&apos;s documentation (funding; HIP-3 deployer actions).
        See also <Link href="/markets/">all markets</Link>.
      </p>
    </main>
  );
}
