'use client';
/** The header's live-data indicator (docs/hlcharts-website.md §3.2): what the visitor is seeing, honestly. */
import { LIVE_STATUS } from '@/lib/live/constants';
import { useLiveClient } from '@/lib/live/use-live-client';
import { cn } from '@/lib/utils';

const TEXT: Record<string, { label: string; tone: string }> = {
  [LIVE_STATUS.live]: { label: 'Live from Hyperliquid', tone: 'text-positive' },
  [LIVE_STATUS.connecting]: { label: 'Connecting to Hyperliquid…', tone: 'text-warning' },
  [LIVE_STATUS.limited]: { label: 'Live data limited from your network', tone: 'text-warning' },
  [LIVE_STATUS.offline]: { label: 'Offline', tone: 'text-destructive' },
};

/**
 * The indicator keeps the width of the label every visitor sees first, from the first paint,
 * so the header beside it does not move as the status changes: it moved by about 40 px on
 * every page load (Cloudflare's layout-shift report, 2026-10-18). Longer labels truncate and
 * show in full on hover.
 */
const WIDTH_OF = TEXT[LIVE_STATUS.connecting].label;

export function LiveStatus() {
  const { client, startError } = useLiveClient();
  const s = !client
    ? null
    : startError
      ? { label: 'Could not reach Hyperliquid', tone: 'text-destructive' }
      : TEXT[client.status()];
  return (
    <span className="grid min-w-0 grid-cols-[minmax(0,max-content)] text-xs sm:text-sm">
      <span
        aria-hidden
        className="invisible col-start-1 row-start-1 flex items-center gap-1.5 overflow-hidden whitespace-nowrap"
      >
        <span className="size-2 shrink-0" />
        {WIDTH_OF}
      </span>
      {s && client && (
        <span
          className={cn(
            'col-start-1 row-start-1 flex min-w-0 items-center gap-1.5',
            s.tone
          )}
          title={s.label}
        >
          <span aria-hidden className="relative flex size-2 shrink-0">
            {client.status() === LIVE_STATUS.live && !startError && (
              <span className="absolute inline-flex size-full animate-ping rounded-full bg-current opacity-60 motion-reduce:hidden" />
            )}
            <span className="relative inline-flex size-2 rounded-full bg-current" />
          </span>
          <span className="truncate">{s.label}</span>
        </span>
      )}
    </span>
  );
}
