/** Sort rows by any value; rows without one (null, NaN) always go last, whatever the direction; ties by key. */
export function sortBy<T extends { key: string }>(
  rows: readonly T[],
  value: (r: T) => number | string | null,
  desc: boolean
): T[] {
  return [...rows].sort((a, b) => {
    const x = value(a);
    const y = value(b);
    if (x === null || (typeof x === 'number' && Number.isNaN(x))) return 1;
    if (y === null || (typeof y === 'number' && Number.isNaN(y))) return -1;
    const c = typeof x === 'string' ? x.localeCompare(String(y)) : x - (y as number);
    return (desc ? -c : c) || a.key.localeCompare(b.key);
  });
}
