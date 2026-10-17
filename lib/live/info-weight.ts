/**
 * The weight Hyperliquid charges for an info request: up front from its type,
 * plus, for list replies, one unit per N items, charged after the reply.
 */
import { INFO_EXTRA_PER_ITEMS, INFO_WEIGHT_CHEAP, INFO_WEIGHT_DEFAULT } from './constants';

export function infoWeight(
  body: { type?: unknown },
  reply?: unknown
): { upfront: number; extra: number } {
  const type = String(body.type);
  const upfront = INFO_WEIGHT_CHEAP[type] ?? INFO_WEIGHT_DEFAULT;
  const per = INFO_EXTRA_PER_ITEMS[type];
  const extra = per && Array.isArray(reply) ? Math.floor(reply.length / per) : 0;
  return { upfront, extra };
}
