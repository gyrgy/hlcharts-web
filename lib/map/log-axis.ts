/**
 * A base-10 log axis spanning whole decades around the values, so every tick
 * is a power of ten. `from` and `to` are pixels; `to` may be smaller than
 * `from` (a y axis grows upwards).
 */
export interface LogAxis {
  lo: number;
  hi: number;
  ticks: number[];
  pos(v: number): number;
}

export function logAxis(values: readonly number[], from: number, to: number): LogAxis {
  const positive = values.filter((v) => v > 0 && Number.isFinite(v));
  if (!positive.length) throw new Error('logAxis: no positive values');
  const eLo = Math.floor(Math.log10(Math.min(...positive)));
  const eHi = Math.max(Math.ceil(Math.log10(Math.max(...positive))), eLo + 1);
  const ticks: number[] = [];
  for (let e = eLo; e <= eHi; e++) ticks.push(10 ** e);
  return {
    lo: 10 ** eLo,
    hi: 10 ** eHi,
    ticks,
    pos: (v) => from + ((to - from) * (Math.log10(v) - eLo)) / (eHi - eLo),
  };
}
