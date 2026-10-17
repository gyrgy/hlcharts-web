/**
 * The perp listing auction, read for people: when it started and ends, the
 * price now, and whether that price is where the documented rule puts it (a
 * straight line from the start price down to 500 HYPE over the auction). If
 * Hyperliquid's figure leaves the line, the page shows its figures and drops
 * the explanation rather than explain a rule that no longer holds.
 */
import { DEPLOY_AUCTION_FLOOR_HYPE } from '../hl/constants';
import { PerpDeployAuctionStatus } from '../hl/types';

/**
 * The browser's clock and the reply's moment differ by seconds; the price
 * falls ~0.006 HYPE a second (1,129 to 500 over 31 h, 2026-10-04), so a
 * minute of skew moves it ~0.3 HYPE. 1% of the start price allows for that.
 */
const ON_LINE_TOLERANCE = 0.01;

export interface AuctionView {
  startMs: number;
  endMs: number;
  startGas: number;
  currentGas: number;
  floorGas: number;
  /** The price paid, once someone has bought; null before. */
  soldAt: number | null;
  state: 'running' | 'sold' | 'ended';
  /** Where the documented line puts the price at nowMs. */
  linePrice: number;
  onLine: boolean;
}

export function auctionView(s: PerpDeployAuctionStatus, nowMs: number): AuctionView {
  const startMs = s.startTimeSeconds * 1000;
  const endMs = startMs + s.durationSeconds * 1000;
  const startGas = Number(s.startGas);
  const currentGas = Number(s.currentGas);
  const soldAt = s.endGas === null ? null : Number(s.endGas);
  const elapsed = Math.min(1, Math.max(0, (nowMs - startMs) / (endMs - startMs)));
  const linePrice = startGas - (startGas - DEPLOY_AUCTION_FLOOR_HYPE) * elapsed;
  return {
    startMs,
    endMs,
    startGas,
    currentGas,
    floorGas: DEPLOY_AUCTION_FLOOR_HYPE,
    soldAt,
    state: soldAt !== null ? 'sold' : nowMs >= endMs ? 'ended' : 'running',
    linePrice,
    onLine: Math.abs(currentGas - linePrice) <= startGas * ON_LINE_TOLERANCE,
  };
}
