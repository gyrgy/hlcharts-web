'use client';
/**
 * An embedded chart (plan §3.3, `/embed/<chart-id>/?m=&r=`): the chart alone,
 * live, with a credit linking to its page on hlcharts. The address is checked
 * first (lib/embed/parse-embed.ts), then the markets against Hyperliquid's
 * live list; anything unknown is said plainly, never guessed.
 */
import { useEffect, useState } from 'react';
import { CHART_SPECS, ChartId } from '@/lib/charts/chart-registry';
import { EmbedRequest, parseEmbed } from '@/lib/embed/parse-embed';
import { useLiveClient } from '@/lib/live/use-live-client';
import { liveTargets, LiveTarget } from '@/lib/not-found/live-targets';
import { SITE_URL } from '@/lib/site';
import { FundingChart } from '../../components/funding-chart';
import { FundingCompareChart } from '../../components/funding-compare-chart';
import { PagePathContext } from '../../components/page-path-context';
import { PriceChart } from '../../components/price-chart';
import { TermChart } from '../../learn/term-chart';

/** The overview charts are drawn by the Learn chart switch, which already builds them from live data. */
const OVERVIEW = {
  'funding.histogram': 'funding-histogram',
  'markets.map': 'market-map',
  'oi.treemap': 'oi-treemap',
  'lending.curve': 'lending-curve',
} as const;

interface Market {
  key: string;
  label: string;
  path: string;
  perp: boolean;
}

function marketIndex(targets: Map<string, LiveTarget>): Map<string, Market> {
  const out = new Map<string, Market>();
  for (const t of targets.values()) {
    if (t.kind === 'perp') {
      const { market } = t.page;
      const name = market.dex ? market.name.slice(market.dex.length + 1) : market.name;
      out.set(market.name, {
        key: market.name,
        label: market.dex ? `${name} on ${market.dex}` : name,
        path: t.page.path,
        perp: true,
      });
    } else {
      out.set(t.page.coin, {
        key: t.page.coin,
        label: `${t.page.base}/${t.page.quote}`,
        path: t.page.path,
        perp: false,
      });
    }
  }
  return out;
}

function Credit({ path, text }: { path: string; text: string }) {
  return (
    <p style={{ fontSize: '0.8em', color: 'var(--muted-foreground)', margin: '0.3rem 0 0' }}>
      <a href={`${SITE_URL}${path}`} target="_blank" rel="noopener">
        {text}
      </a>
      , live from Hyperliquid&apos;s public API on hlcharts.com · CC BY
    </p>
  );
}

export function EmbedView({ chart }: { chart: ChartId }) {
  const { client, startError } = useLiveClient();
  const [req, setReq] = useState<EmbedRequest | { error: string } | null>(null);
  const [markets, setMarkets] = useState<Map<string, Market> | null>(null);
  const [removed, setRemoved] = useState<string[]>([]);

  useEffect(() => setReq(parseEmbed(chart, window.location.search)), [chart]);
  useEffect(() => {
    if (!client) return;
    let stopped = false;
    void client
      .start()
      .then(() => !stopped && setMarkets(marketIndex(liveTargets(client.universe))))
      .catch(() => !stopped && setMarkets(new Map()));
    return () => {
      stopped = true;
    };
  }, [client]);

  if (startError)
    return <p style={{ color: 'var(--destructive)' }}>Could not reach Hyperliquid: {startError}</p>;
  if (!req) return null;
  if ('error' in req)
    return (
      <p style={{ color: 'var(--destructive)' }}>
        This embed&apos;s address is not valid: {req.error}
      </p>
    );
  const spec = CHART_SPECS[chart];

  if (req.chart in OVERVIEW) {
    const page = spec.page ?? '/';
    return (
      <PagePathContext.Provider value={page}>
        <TermChart chart={OVERVIEW[req.chart as keyof typeof OVERVIEW]} />
        <Credit path={page} text="See it on hlcharts" />
      </PagePathContext.Provider>
    );
  }
  if (!markets)
    return (
      <p style={{ color: 'var(--muted-foreground)' }}>Loading Hyperliquid&apos;s market list…</p>
    );

  if (req.chart === 'market.price' || req.chart === 'market.funding') {
    const m = markets.get(req.market);
    if (!m)
      return (
        <p style={{ color: 'var(--destructive)' }}>
          Hyperliquid does not list a market called &quot;{req.market}&quot;.
        </p>
      );
    if (req.chart === 'market.funding' && !m.perp)
      return <p style={{ color: 'var(--destructive)' }}>{m.label} is spot: it has no funding.</p>;
    return (
      <PagePathContext.Provider value={m.path}>
        {req.chart === 'market.price' ? (
          <PriceChart coin={m.key} label={m.label} initialInterval={req.interval} />
        ) : (
          <FundingChart coin={m.key} label={m.label} initialRange={req.range} />
        )}
        <Credit path={m.path} text={`${m.label} on hlcharts`} />
      </PagePathContext.Provider>
    );
  }

  if (req.chart === 'funding.compare') {
    const unknown = req.markets.filter((k) => !markets.get(k)?.perp);
    if (unknown.length)
      return (
        <p style={{ color: 'var(--destructive)' }}>
          Not perps listed on Hyperliquid: {unknown.join(', ')}.
        </p>
      );
    const picks = req.markets
      .filter((k) => !removed.includes(k))
      .map((k) => ({ key: k, label: markets.get(k)?.label ?? k }));
    const page = spec.page ?? '/funding/';
    return (
      <PagePathContext.Provider value={page}>
        <FundingCompareChart
          picks={picks}
          unit={req.unit}
          initialDays={req.days}
          onRemove={(k) => setRemoved([...removed, k])}
        />
        <Credit path={page} text="Funding on hlcharts" />
      </PagePathContext.Provider>
    );
  }
  return null;
}
