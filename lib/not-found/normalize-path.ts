/**
 * The address a mistyped or raw-form path most likely means (plan §2: on the
 * static site, the 404 page redirects in the browser): lowercase, a builder
 * exchange's "xyz:NVDA" as "xyz/nvda", a spot "HYPE/USDC" as "hype-usdc", and
 * a trailing slash. `/perps/xyz:NVDA` -> `/perps/xyz/nvda/`.
 */
export function normalizePath(pathname: string): string {
  let s = pathname;
  try {
    s = decodeURIComponent(pathname);
  } catch {
    // Not valid percent-encoding: use it as it is.
  }
  s = s.toLowerCase().replace(/:/g, '/');
  if (!s.startsWith('/')) s = `/${s}`;
  if (!s.endsWith('/')) s = `${s}/`;
  s = s.replace(/\/{2,}/g, '/');
  const seg = s.slice(1, -1).split('/');
  if (seg[0] === 'spot' && seg.length === 3) s = `/spot/${seg[1]}-${seg[2]}/`;
  return s;
}
