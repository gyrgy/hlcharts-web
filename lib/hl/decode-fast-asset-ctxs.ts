/**
 * fastAssetCtxs arrives as base64 of raw-deflated JSON (checked 2026-10-04).
 * Decoded with the browser's DecompressionStream; throws where the browser
 * has no 'deflate-raw' support, so the page says so instead of showing nothing.
 */
import { FastAssetCtxs } from './types';

export async function decodeFastAssetCtxs(data: unknown): Promise<FastAssetCtxs> {
  if (typeof data !== 'string')
    throw new Error(`fastAssetCtxs: expected a base64 string, got ${typeof data}`);
  if (typeof DecompressionStream === 'undefined')
    throw new Error('this browser has no DecompressionStream');
  const binary = atob(data);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  const stream = new Blob([bytes]).stream().pipeThrough(new DecompressionStream('deflate-raw'));
  return JSON.parse(await new Response(stream).text()) as FastAssetCtxs;
}
