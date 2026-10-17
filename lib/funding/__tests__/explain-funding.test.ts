/**
 * "Funding explained" must say what Hyperliquid's formula says, and nothing
 * when the rate cannot come from it. The cases are the formula's own states,
 * the docs' worked example, and the live builder-exchange rate seen on
 * 2026-10-04.
 */
import { describe, expect, it } from 'vitest';
import { explainFunding, FUNDING_CAP_HOURLY } from '../explain-funding';
import { fundingParams } from '../funding-params';

const main = fundingParams('', 'BTC');

describe('funding explained', () => {
  it('reads the baseline 0.00125%/h as "funding equals the interest rate"', () => {
    expect(explainFunding(0.0000125, main)).toMatchObject({ state: 'band', impliedPremium: null });
  });

  it("matches the docs' worked example: a 1% premium gives 0.95% per 8 h, and back", () => {
    const e = explainFunding(0.0095 / 8, main);
    expect(e.state).toBe('above');
    expect(e.impliedPremium).toBeCloseTo(0.01, 12);
  });

  it('backs out a negative premium when the clamp binds the other way', () => {
    // premium −0.2% per 8 h: rate = −0.2% + 0.05% = −0.15% per 8 h.
    const e = explainFunding(-0.0015 / 8, main);
    expect(e.state).toBe('below');
    expect(e.impliedPremium).toBeCloseTo(-0.002, 12);
  });

  it('removes a builder exchange multiplier before reading the state (xyz, 0.5, live 2026-10-04)', () => {
    const xyz = fundingParams('xyz', 'xyz:NVDA', { multiplier: [['xyz:NVDA', '0.5']] });
    expect(xyz).toMatchObject({ interest8h: 0.0001, clamp8h: 0.0003, multiplier: 0.5 });
    expect(xyz.documented).toEqual({ interest: false, clamp: true, multiplier: true });
    expect(explainFunding(0.00000625, xyz).state).toBe('band');
    const eur = fundingParams('xyz', 'xyz:EUR', {
      interest: [['xyz:EUR', '0.0']],
      multiplier: [['xyz:EUR', '0.5']],
    });
    expect(explainFunding(0, eur).state).toBe('band');
  });

  it('reads a published rate rounded to 10 decimals as the band value (mkts:US500, 5% a year)', () => {
    const us500 = fundingParams('mkts', 'mkts:US500', {
      interest: [['mkts:US500', '0.0000456621']],
    });
    expect(explainFunding(0.0000057078, us500).state).toBe('band');
    // ...while a genuinely different rate still reads as the clamp at work.
    expect(
      explainFunding(
        0.0000238338,
        fundingParams('mkts', 'mkts:USBOND', { interest: [['mkts:USBOND', '0.0000456621']] })
      ).state
    ).toBe('above');
  });

  it('gives no breakdown for a rate the formula cannot produce', () => {
    expect(explainFunding(FUNDING_CAP_HOURLY * 1.01, main).state).toBe('unexplained');
    expect(explainFunding(Number.NaN, main).state).toBe('unexplained');
  });
});
