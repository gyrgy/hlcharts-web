'use client';
/**
 * The 404 page, live (plan §2): a raw or mistyped address of an existing page
 * is sent there; a market listed since the last build is shown live under the
 * address its page will have; anything else gets a plain "not found". Every
 * 404 is noindex, so a market shown here is not indexed until the next build
 * publishes its page.
 */
import Link from 'next/link';
import { useEffect, useState } from 'react';
import { exchangePath } from '@/lib/markets/market-paths';
import { liveTargets } from '@/lib/not-found/live-targets';
import { Resolution, resolveMissing } from '@/lib/not-found/resolve-missing';
import { useLiveClient } from '@/lib/live/use-live-client';
import { loadIndex } from '@/lib/search/load-index';
import { SearchEntry } from '@/lib/search/types';
import { SITE_PAGES } from '@/lib/site-pages';
import { PerpPageView } from './perps/perp-page-view';
import { SpotPageView } from './spot/spot-page-view';

function NewListing() {
  return (
    <p
      style={{
        background: 'color-mix(in oklch, var(--warning) 14%, transparent)',
        padding: '0.5rem 0.8rem',
        maxWidth: '50rem',
      }}
    >
      Hyperliquid listed this market after our last update, so its page is shown live here; it is
      published with the next daily update.
    </p>
  );
}

export function MissingPage() {
  const { client, startError } = useLiveClient();
  const [result, setResult] = useState<Resolution | null>(null);

  useEffect(() => {
    if (!client) return;
    let stopped = false;
    const { pathname, search, hash } = window.location;
    void Promise.all([loadIndex().catch((): SearchEntry[] => []), client.start()])
      .then(([index]) => {
        const u = client.universe;
        const built = new Set([
          ...index.map((e) => e.path),
          ...SITE_PAGES.map((p) => p.path),
          ...[...u.perps.keys()].map(exchangePath),
        ]);
        const r = resolveMissing(pathname, built, liveTargets(u));
        if (stopped) return;
        if (r.kind === 'redirect') window.location.replace(`${r.to}${search}${hash}`);
        else setResult(r);
      })
      .catch(() => !stopped && setResult({ kind: 'none' }));
    return () => {
      stopped = true;
    };
  }, [client]);

  if (result?.kind === 'perp') {
    return (
      <>
        <NewListing />
        <PerpPageView page={result.page} />
      </>
    );
  }
  if (result?.kind === 'spot') {
    return (
      <>
        <NewListing />
        <SpotPageView page={result.page} />
      </>
    );
  }
  return (
    <main>
      <h1>Not found</h1>
      {!result && !startError ? (
        <p style={{ color: 'var(--muted-foreground)' }}>
          Checking whether this is a market listed since our last update…
        </p>
      ) : (
        <p style={{ maxWidth: '50rem' }}>
          There is no page at this address. Every market is in the{' '}
          <Link href="/markets/">markets table</Link>, and the search box above finds any of them by
          name.
        </p>
      )}
    </main>
  );
}
