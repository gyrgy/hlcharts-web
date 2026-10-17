import type { Metadata } from 'next';
import { breadcrumbList } from '@/lib/seo/breadcrumbs';
import { pageMetadata } from '@/lib/seo/page-metadata';
import { JsonLd } from '../components/json-ld';
import Link from 'next/link';
import { CHANGELOG, METRICS } from '@/lib/methodology/metrics';
import { NoJs } from '../components/no-js';
import { WorkedExample } from './worked-example';

export const metadata: Metadata = pageMetadata({
  title: 'Methodology: how every hlcharts number is defined | hlcharts',
  description:
    "The definition, source, refresh rate and known traps of every number on hlcharts, with a worked example and a dated log of definition changes. All figures come from Hyperliquid's public API.",
  path: '/methodology/',
});

const label = {
  fontWeight: 600,
  paddingRight: '0.8rem',
  verticalAlign: 'top' as const,
  whiteSpace: 'nowrap' as const,
};

/** Written at build time from lib/methodology/metrics.ts; only the worked example is live. */
export default function MethodologyPage() {
  return (
    <main style={{ maxWidth: '52rem' }}>
      <JsonLd data={breadcrumbList([{ name: 'Methodology', path: '/methodology/' }])} />
      <h1>Methodology</h1>
      <p>
        How every number on this site is defined: what it is, where it comes from, how often it
        updates, what span of time it covers, and what can mislead. These are our definitions, not
        verdicts on anyone else&apos;s; where another site shows a different figure, it may simply
        count differently. When a definition changes, the change is dated in the{' '}
        <Link href="#changelog">changelog</Link>.
      </p>
      <nav style={{ columns: '16rem', fontSize: '0.9em', margin: '1rem 0' }}>
        {METRICS.map((m) => (
          <div key={m.id}>
            <Link href={`#${m.id}`}>{m.name}</Link>
          </div>
        ))}
        <div>
          <Link href="#changelog">Changelog</Link>
        </div>
      </nav>

      <h2>A worked example: trade.xyz&apos;s open interest</h2>
      <p>
        Open interest is Hyperliquid&apos;s open-interest figure for each live market, in contracts,
        times its mark price, summed over the exchange&apos;s live markets (see{' '}
        <Link href="#open-interest">open interest</Link>). For trade.xyz (exchange <code>xyz</code>
        ), right now:
      </p>
      <WorkedExample />
      <NoJs live="The worked example's figures are live." />

      {METRICS.map((m) => (
        <section key={m.id} id={m.id} style={{ marginTop: '1.6rem', scrollMarginTop: '1rem' }}>
          <h2 style={{ fontSize: '1.15em', marginBottom: '0.3rem' }}>
            <Link href={`#${m.id}`} style={{ color: 'inherit', textDecoration: 'none' }}>
              {m.name}
            </Link>
          </h2>
          <p style={{ marginTop: 0 }}>{m.what}</p>
          <table style={{ borderCollapse: 'collapse', fontSize: '0.9em' }}>
            <tbody>
              {m.formula && (
                <tr>
                  <td style={label}>Formula</td>
                  <td style={{ fontFamily: 'ui-monospace, monospace', fontSize: '0.92em' }}>
                    {m.formula}
                  </td>
                </tr>
              )}
              <tr>
                <td style={label}>Source</td>
                <td>{m.source}</td>
              </tr>
              <tr>
                <td style={label}>Updates</td>
                <td>{m.refresh}</td>
              </tr>
              <tr>
                <td style={label}>Covers</td>
                <td>{m.span}</td>
              </tr>
            </tbody>
          </table>
          {m.traps.length > 0 && (
            <ul style={{ fontSize: '0.9em', color: 'var(--muted-foreground)' }}>
              {m.traps.map((t) => (
                <li key={t}>{t}</li>
              ))}
            </ul>
          )}
        </section>
      ))}

      <section id="changelog" style={{ marginTop: '2rem', scrollMarginTop: '1rem' }}>
        <h2>Changelog</h2>
        <p style={{ fontSize: '0.9em' }}>
          Every change to a definition, dated: a change alters what an embed, a download or a post
          made before it meant.
        </p>
        <ul>
          {CHANGELOG.map((e) => (
            <li key={`${e.date}${e.change}`}>
              <b>{e.date}</b>: {e.change}
            </li>
          ))}
        </ul>
      </section>
    </main>
  );
}
