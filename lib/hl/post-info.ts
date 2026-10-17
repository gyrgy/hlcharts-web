/** One request to Hyperliquid's info endpoint; throws on a non-200 reply so a failure is never shown as data. */
import { HL_INFO_URL } from './constants';

export async function postInfo<T>(body: Record<string, unknown>): Promise<T> {
  const res = await fetch(HL_INFO_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  if (!res.ok) throw new Error(`Hyperliquid ${String(body.type)}: HTTP ${res.status}`);
  return (await res.json()) as T;
}
