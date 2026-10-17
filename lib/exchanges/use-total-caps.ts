'use client';
/**
 * Builder exchanges' exchange-wide open-interest caps (perpDexLimits, weight
 * 20 each), for the exchanges asked for only: /exchanges asks for those with
 * live markets, an exchange's page for itself. Refreshed every 5 minutes;
 * an exchange whose request fails is left out (shown as missing), and the
 * error is returned.
 */
import { useEffect, useState } from 'react';
import { INFO } from '../hl/constants';
import { PerpDexLimits } from '../hl/types';
import { LiveClient } from '../live/live-client';

const LIMITS_POLL_MS = 5 * 60_000;

export function useTotalCaps(
  client: LiveClient | null,
  dexes: readonly string[]
): { caps: Map<string, number>; error: string } {
  const [caps, setCaps] = useState(new Map<string, number>());
  const [error, setError] = useState('');
  const key = dexes.join(',');
  useEffect(() => {
    if (!client || !key) return;
    let stopped = false;
    const load = async (): Promise<void> => {
      const next = new Map<string, number>();
      let failed = '';
      for (const dex of key.split(',')) {
        try {
          const l = await client.info.request<PerpDexLimits>(
            { type: INFO.perpDexLimits, dex },
            { cache: true }
          );
          next.set(dex, Number(l.totalOiCap));
        } catch (e) {
          failed = String(e);
        }
      }
      if (stopped) return;
      setCaps(next);
      setError(failed);
    };
    void load();
    const timer = setInterval(() => void load(), LIMITS_POLL_MS);
    return () => {
      stopped = true;
      clearInterval(timer);
    };
  }, [client, key]);
  return { caps, error };
}
