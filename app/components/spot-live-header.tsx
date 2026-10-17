'use client';
/** A spot pair's live figures: price every second, change and volume from the 5-minute spot snapshot. */
import { INFO } from '@/lib/hl/constants';
import { SpotMetaAndAssetCtxs } from '@/lib/hl/types';
import { MISSING, pctSigned, price, usdCompact } from '@/lib/format/format';
import { useLiveClient } from '@/lib/live/use-live-client';
import { usePolledInfo } from '@/lib/live/use-polled-info';

const SPOT_POLL_MS = 5 * 60_000;

export function SpotLiveHeader({ coin, quote }: { coin: string; quote: string }) {
  const { client } = useLiveClient();
  const spot = usePolledInfo<SpotMetaAndAssetCtxs>(
    client,
    { type: INFO.spotMetaAndAssetCtxs },
    SPOT_POLL_MS
  );
  if (!client) return null;
  const ctx = spot.data?.[1].find((c) => c.coin === coin);
  if (!ctx)
    return (
      <p style={{ color: 'var(--muted-foreground)' }}>{spot.error || 'Waiting for live data…'}</p>
    );
  const mark = Number(client.store.tick(coin)?.markPx ?? ctx.markPx);
  const prev = Number(ctx.prevDayPx);
  const items: [string, string][] = [
    [`Price (${quote})`, price(mark)],
    ['24 h', prev > 0 ? pctSigned(mark / prev - 1) : MISSING],
    [`Volume 24 h (${quote})`, usdCompact(Number(ctx.dayNtlVlm)).replace('$', '')],
  ];
  return (
    <dl
      style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fill, minmax(11rem, 1fr))',
        gap: '0.6rem 1.5rem',
        margin: '1rem 0',
      }}
    >
      {items.map(([label, value]) => (
        <div key={label}>
          <dt style={{ fontSize: '0.8em', color: 'var(--muted-foreground)' }}>{label}</dt>
          <dd style={{ margin: 0, fontWeight: 600, fontVariantNumeric: 'tabular-nums' }}>
            {value}
          </dd>
        </div>
      ))}
    </dl>
  );
}
