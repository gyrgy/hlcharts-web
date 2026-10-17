'use client';
/**
 * React access to the tab's live client: starts it on first use, re-renders
 * on market changes (at most once a second, the store's pace) and once a
 * second for ages and the status. Returns null until mounted: there is no
 * client during the static build.
 */
import { useEffect, useState } from 'react';
import { getLiveClient } from './get-live-client';
import { LiveClient } from './live-client';

export function useLiveClient(): { client: LiveClient | null; startError: string } {
  const [client, setClient] = useState<LiveClient | null>(null);
  const [startError, setStartError] = useState('');
  const [, setVersion] = useState(0);

  useEffect(() => {
    const c = getLiveClient();
    setClient(c);
    c.start().catch((e: unknown) => setStartError(String(e)));
    const off = c.store.subscribe(() => setVersion((v) => v + 1));
    const timer = setInterval(() => setVersion((v) => v + 1), 1000);
    return () => {
      off();
      clearInterval(timer);
    };
  }, []);

  return { client, startError };
}
