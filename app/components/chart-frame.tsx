'use client';
/**
 * Around every chart (plan §3.2): the same numbers as a table (for screen
 * readers and keyboard users), a CSV of what is on screen, a 1200×630 PNG
 * snapshot, the embed code, and a line naming the source, the definition and
 * the chart's stable id. The chart stays mounted while the table shows, so switching back
 * reloads nothing.
 */
import {
  ChartLineIcon,
  CodeIcon,
  CopyIcon,
  DownloadIcon,
  ImageIcon,
  TableIcon,
} from 'lucide-react';
import Link from 'next/link';
import { type ReactNode, useContext, useRef, useState } from 'react';
import { Button } from '@/components/ui/button';
import { CHART_SPECS, ChartId } from '@/lib/charts/chart-registry';
import { findDrawing, saveBlob, snapshotPng } from '@/lib/charts/snapshot';
import { ChartTable, chartFileName, toCsv } from '@/lib/charts/to-csv';
import { embedSnippet } from '@/lib/embed/embed-snippet';
import { ChartLoading } from './chart-loading';
import { PagePathContext } from './page-path-context';
import { tableBox } from './table-box';

const show = (v: string | number | null): string =>
  v === null ? '' : typeof v === 'number' ? String(Number(v.toPrecision(8))) : v;

export function ChartFrame({
  id,
  title,
  fileTag = '',
  table,
  legend,
  embedParams = {},
  loading = '',
  height = 0,
  children,
}: {
  id: ChartId;
  title: string;
  fileTag?: string;
  table: ChartTable | null;
  legend?: { label: string; colour: string }[];
  /** The chart's settings for its embed address (market, range, unit). */
  embedParams?: Record<string, string>;
  /** While the chart's data is on its way: what is being fetched; '' once it is drawn. */
  loading?: string;
  /** The chart's drawn height: the space kept for it while it loads, so the page does not jump. */
  height?: number;
  children: ReactNode;
}) {
  const [view, setView] = useState<'chart' | 'table'>('chart');
  const [note, setNote] = useState('');
  const [embedOpen, setEmbedOpen] = useState(false);
  // The page the chart belongs to: an embed names it; on the site it is this page.
  const pagePath = useContext(PagePathContext);
  const page = (): string => pagePath ?? window.location.pathname;
  const area = useRef<HTMLDivElement>(null);
  const spec = CHART_SPECS[id];

  const csv = (): void => {
    if (!table) return;
    saveBlob(
      new Blob([toCsv(table)], { type: 'text/csv' }),
      chartFileName(id, fileTag, new Date(), 'csv')
    );
  };
  const snapshot = async (): Promise<void> => {
    const drawing = area.current ? findDrawing(area.current) : null;
    if (!drawing) return setNote('This chart has nothing to draw yet.');
    try {
      const at = new Date();
      const png = await snapshotPng(
        drawing,
        {
          title,
          source: spec.source,
          watermark: `hlcharts.com${page()}`,
          legend,
        },
        at
      );
      saveBlob(png, chartFileName(id, fileTag, at, 'png'));
      setNote('');
    } catch (e) {
      setNote(String(e instanceof Error ? e.message : e));
    }
  };

  return (
    <figure style={{ margin: '0.4rem 0 1.4rem' }}>
      <div className="mb-1 flex flex-wrap justify-end gap-0.5">
        <Button
          variant="ghost"
          size="xs"
          onClick={() => setView(view === 'chart' ? 'table' : 'chart')}
          disabled={!table}
        >
          {view === 'chart' ? <TableIcon /> : <ChartLineIcon />}
          {view === 'chart' ? 'Table' : 'Chart'}
        </Button>
        <Button variant="ghost" size="xs" onClick={csv} disabled={!table?.rows.length}>
          <DownloadIcon />
          CSV
        </Button>
        <Button
          variant="ghost"
          size="xs"
          onClick={() => void snapshot()}
          disabled={view !== 'chart' || loading !== ''}
        >
          <ImageIcon />
          Snapshot
        </Button>
        <Button
          variant="ghost"
          size="xs"
          onClick={() => setEmbedOpen(!embedOpen)}
          aria-expanded={embedOpen}
        >
          <CodeIcon />
          Embed
        </Button>
      </div>
      {embedOpen && (
        <EmbedCode code={embedSnippet({ id, params: embedParams, title, pagePath: page() })} />
      )}
      <div
        ref={area}
        hidden={view !== 'chart'}
        style={{ position: 'relative', minHeight: loading ? height : undefined }}
      >
        {children}
        {loading && <ChartLoading text={loading} />}
      </div>
      {view === 'table' && table && (
        <div {...tableBox('60vh')}>
          <table
            style={{
              borderCollapse: 'collapse',
              fontSize: '0.85em',
              fontVariantNumeric: 'tabular-nums',
            }}
          >
            <caption style={{ textAlign: 'left', fontWeight: 600, padding: '0.2rem 0' }}>
              {title}
            </caption>
            <thead>
              <tr>
                {table.columns.map((c) => (
                  <th
                    key={c}
                    style={{
                      padding: '0.15rem 0.6rem',
                      textAlign: 'right',
                      borderBottom: '1px solid var(--border)',
                      position: 'sticky',
                      top: 0,
                      background: 'var(--background)',
                    }}
                  >
                    {c}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {table.rows.map((r, i) => (
                <tr key={i}>
                  {r.map((v, j) => (
                    <td
                      key={j}
                      style={{
                        padding: '0.1rem 0.6rem',
                        textAlign: typeof v === 'number' ? 'right' : 'left',
                      }}
                    >
                      {show(v)}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      {note && <p style={{ color: 'var(--warning)', fontSize: '0.8em' }}>{note}</p>}
      <figcaption
        style={{ fontSize: '0.75em', color: 'var(--muted-foreground)', marginTop: '0.2rem' }}
      >
        Source: Hyperliquid <code>{spec.source}</code> ·{' '}
        <Link href={`/methodology/#${spec.methodology}`}>definition</Link> · chart <code>{id}</code>{' '}
        · CC BY
      </figcaption>
    </figure>
  );
}

function EmbedCode({ code }: { code: string }) {
  const [copied, setCopied] = useState('');
  return (
    <div className="mb-2 rounded-lg border bg-muted/50 p-2 text-xs">
      <textarea
        readOnly
        value={code}
        rows={4}
        onFocus={(e) => e.target.select()}
        className="w-full font-mono text-xs"
        aria-label="Embed code"
      />
      <div className="mt-1 flex flex-wrap items-center gap-2">
        <Button
          variant="outline"
          size="xs"
          onClick={() =>
            void navigator.clipboard.writeText(code).then(
              () => setCopied('Copied.'),
              () => setCopied('Copy did not work here: select the code and copy it.')
            )
          }
        >
          <CopyIcon />
          Copy
        </Button>
        <span>{copied} Live chart, CC BY: keep the credit link below the frame.</span>
      </div>
    </div>
  );
}
