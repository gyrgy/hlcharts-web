'use client';
/** Every exchange's market list with settings (lib/listings/listings.ts), refreshed every 5 minutes. */
import { INFO } from '../hl/constants';
import { PerpDex, PerpMetaWithCollateral } from '../hl/types';
import { ExchangeListing, listings } from '../listings/listings';
import { LiveClient } from '../live/live-client';
import { usePolledInfo } from '../live/use-polled-info';

const LISTINGS_POLL_MS = 5 * 60_000;

export function useExchangeListings(client: LiveClient | null): {
  exchanges: ExchangeListing[] | null;
  dexes: (PerpDex | null)[] | null;
  error: string;
} {
  const dexes = usePolledInfo<(PerpDex | null)[]>(
    client,
    { type: INFO.perpDexs },
    LISTINGS_POLL_MS
  );
  const metas = usePolledInfo<PerpMetaWithCollateral[]>(
    client,
    { type: INFO.allPerpMetas },
    LISTINGS_POLL_MS
  );
  const atCap = usePolledInfo<string[]>(
    client,
    { type: INFO.perpsAtOpenInterestCap },
    LISTINGS_POLL_MS
  );
  if (!dexes.data || !metas.data) {
    return { exchanges: null, dexes: null, error: dexes.error || metas.error };
  }
  try {
    return {
      exchanges: listings(dexes.data, metas.data, new Set(atCap.data ?? [])),
      dexes: dexes.data,
      error: '',
    };
  } catch (e) {
    return { exchanges: null, dexes: dexes.data, error: String(e) };
  }
}
