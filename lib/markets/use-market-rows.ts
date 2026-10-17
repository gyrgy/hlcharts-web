'use client';
/**
 * Every market as table rows, live: perps from the tab's store (with the
 * main exchange's at-cap list and Binance's / Bybit's predicted funding) and
 * spot pairs from the 5-minute snapshot, with the "also on" matches. Shared by
 * the pages that show many markets at once.
 */
import { INFO } from '../hl/constants';
import { PredictedFundings, SpotMetaAndAssetCtxs } from '../hl/types';
import { LiveClient } from '../live/live-client';
import { useLiveClient } from '../live/use-live-client';
import { usePolledInfo } from '../live/use-polled-info';
import { buildPerpRows } from './build-perp-rows';
import { buildSpotRows } from './build-spot-rows';
import { MarketRow } from './types';
import { withPredictedFunding } from './with-predicted-funding';
import { withSiblings } from './with-siblings';

/** Spot volumes change slowly and cost weight: every 5 min (plan §3.3). */
const SPOT_POLL_MS = 5 * 60_000;
/** The main exchange's at-cap list: every minute (plan §3.3). */
const AT_CAP_POLL_MS = 60_000;
/** Binance's and Bybit's predicted funding: every minute (plan §3.3). */
const PREDICTED_POLL_MS = 60_000;

export function useMarketRows(): {
  client: LiveClient | null;
  startError: string;
  rows: MarketRow[];
  /** The spot poll's last error, '' when fine; spot rows are missing until it succeeds. */
  spotError: string;
  /** False until the perps' row-order check has labelled at least one exchange. */
  ready: boolean;
} {
  const { client, startError } = useLiveClient();
  const spot = usePolledInfo<SpotMetaAndAssetCtxs>(
    client,
    { type: INFO.spotMetaAndAssetCtxs },
    SPOT_POLL_MS
  );
  const atCap = usePolledInfo<string[]>(
    client,
    { type: INFO.perpsAtOpenInterestCap },
    AT_CAP_POLL_MS
  );
  const predicted = usePolledInfo<PredictedFundings>(
    client,
    { type: INFO.predictedFundings },
    PREDICTED_POLL_MS
  );
  if (!client) return { client, startError, rows: [], ready: false, spotError: spot.error };
  const tick = (coin: string): ReturnType<LiveClient['store']['tick']> => client.store.tick(coin);
  const perps = buildPerpRows(
    client.store.perps(),
    tick,
    client.universe.dexes,
    new Set(atCap.data ?? [])
  );
  const rows = withSiblings([
    ...withPredictedFunding(perps, predicted.data),
    ...(spot.data ? buildSpotRows(spot.data, tick) : []),
  ]);
  return { client, startError, rows, ready: perps.length > 0, spotError: spot.error };
}
