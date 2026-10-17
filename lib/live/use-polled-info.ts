'use client';
/**
 * A REST snapshot the sockets do not carry, re-read every `intervalMs`
 * through the tab's shared queue (spot contexts, the at-cap list). Keeps the
 * last good reply when a refresh fails, and says so.
 */
import { useEffect, useState } from 'react';
import { LiveClient } from './live-client';

export function usePolledInfo<T>(
  client: LiveClient | null,
  body: Record<string, unknown>,
  intervalMs: number,
  /** Reuse a reply younger than 60 s (shared across pages); off for figures that must be fresh. */
  cache = true
): { data: T | null; error: string } {
  const [data, setData] = useState<T | null>(null);
  const [error, setError] = useState('');
  const key = JSON.stringify(body);

  useEffect(() => {
    if (!client) return;
    let stopped = false;
    const load = (): void => {
      client.info
        .request<T>(JSON.parse(key) as Record<string, unknown>, { cache })
        .then((d) => {
          if (stopped) return;
          setData(d);
          setError('');
        })
        .catch((e: unknown) => !stopped && setError(String(e)));
    };
    load();
    const timer = setInterval(load, intervalMs);
    return () => {
      stopped = true;
      clearInterval(timer);
    };
  }, [client, key, intervalMs, cache]);

  return { data, error };
}
