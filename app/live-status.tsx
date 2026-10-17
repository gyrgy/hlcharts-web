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

export function LiveStatus() {
  const { client, startError } = useLiveClient();
  if (!client) return null;
  const s = startError
    ? { label: 'Could not reach Hyperliquid', tone: 'text-destructive' }
    : TEXT[client.status()];
  return (
    <span
      className={cn('flex min-w-0 items-center gap-1.5 text-xs sm:text-sm', s.tone)}
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
  );
}
