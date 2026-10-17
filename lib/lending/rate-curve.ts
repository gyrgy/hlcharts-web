/** The documented rate curve, borrow and supply, at evenly spaced utilizations from 0 to 100%. */
import { borrowRateModel, supplyRateModel } from './rate-model';

export interface CurvePoint {
  utilization: number;
  borrow: number;
  supply: number;
}

export function rateCurve(steps: number): CurvePoint[] {
  if (!(steps >= 1)) throw new Error(`rateCurve: ${steps} steps`);
  return Array.from({ length: steps + 1 }, (_, i) => {
    const utilization = i / steps;
    const borrow = borrowRateModel(utilization);
    return { utilization, borrow, supply: supplyRateModel(borrow, utilization) };
  });
}
