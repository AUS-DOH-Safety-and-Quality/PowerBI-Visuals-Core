import { describe, expect, it } from "vitest";
import {
  gamma, lgamma, lgamma1p, lgammaCorrection, stirlingError, chebyshevPolynomial, sinpi, log1pmx, ldexp
} from "../src/math/index";

describe("gamma", () => {
  it("returns factorials for positive integers", () => {
    expect(gamma(1)).toBeCloseTo(1);
    expect(gamma(2)).toBeCloseTo(1);
    expect(gamma(3)).toBeCloseTo(2);
    expect(gamma(4)).toBeCloseTo(6);
    expect(gamma(5)).toBeCloseTo(24);
    expect(gamma(6)).toBeCloseTo(120);
    expect(gamma(7)).toBeCloseTo(720);
    expect(gamma(8)).toBeCloseTo(5040);
    expect(gamma(9)).toBeCloseTo(40320);
    expect(gamma(10)).toBeCloseTo(362880);
  });

  it("returns half-integer and non-integer values", () => {
    expect(gamma(0.5)).toBeCloseTo(Math.sqrt(Math.PI));
    expect(gamma(1.5)).toBeCloseTo(0.5 * Math.sqrt(Math.PI));
    expect(gamma(2.5)).toBeCloseTo(1.329340388179);
    expect(gamma(3.5)).toBeCloseTo(3.323350970447);
    expect(gamma(4.5)).toBeCloseTo(11.631728396567);
  });

  it("handles small positive inputs", () => {
    expect(gamma(0.1)).toBeCloseTo(9.513507698668736);
    expect(gamma(0.01)).toBeCloseTo(99.4325851191506);
    const eps = 1e-10;
    expect(gamma(eps)).toBeCloseTo(1 / eps - 0.5772156649, 1);
  });

  it("handles negative non-integers by reflection", () => {
    expect(gamma(-0.5)).toBeCloseTo(-2 * Math.sqrt(Math.PI));
    expect(gamma(-1.5)).toBeCloseTo((4 / 3) * Math.sqrt(Math.PI));
  });

  it("returns NaN at poles and for NaN", () => {
    expect(gamma(0)).toBeNaN();
    expect(gamma(-1)).toBeNaN();
    expect(gamma(-2)).toBeNaN();
    expect(gamma(-10)).toBeNaN();
    expect(gamma(NaN)).toBeNaN();
  });

  it("approaches overflow with relative accuracy and overflows beyond it", () => {
    const expected = 7.257415615307999e+306;
    expect(Math.abs(gamma(171) - expected) / expected).toBeLessThan(1e-8);
    expect(isFinite(gamma(50))).toBe(true);
    expect(isFinite(gamma(100))).toBe(true);
    expect(isFinite(gamma(170))).toBe(true);
    expect(gamma(172)).toBe(Number.POSITIVE_INFINITY);
    expect(gamma(-171)).toBeNaN();
    expect(gamma(-171.5)).toBe(0);
  });
});

describe("lgamma", () => {
  it("returns log factorials and log half-integer values", () => {
    expect(lgamma(1)).toBeCloseTo(0);
    expect(lgamma(2)).toBeCloseTo(0);
    expect(lgamma(3)).toBeCloseTo(Math.log(2));
    expect(lgamma(4)).toBeCloseTo(Math.log(6));
    expect(lgamma(5)).toBeCloseTo(Math.log(24));
    expect(lgamma(6)).toBeCloseTo(Math.log(120));
    expect(lgamma(10)).toBeCloseTo(Math.log(362880));
    expect(lgamma(0.5)).toBeCloseTo(Math.log(Math.sqrt(Math.PI)));
    expect(lgamma(1.5)).toBeCloseTo(Math.log(0.5 * Math.sqrt(Math.PI)));
  });

  it("handles small, negative and special inputs", () => {
    expect(lgamma(0.1)).toBeCloseTo(Math.log(9.513507698668736));
    expect(lgamma(0.01)).toBeCloseTo(Math.log(99.4325851191506));
    expect(lgamma(-0.5)).toBeCloseTo(Math.log(2 * Math.sqrt(Math.PI)));
    expect(lgamma(-1.5)).toBeCloseTo(Math.log((4 / 3) * Math.sqrt(Math.PI)));
    expect(lgamma(0)).toBe(Number.POSITIVE_INFINITY);
    expect(lgamma(-1)).toBe(Number.POSITIVE_INFINITY);
    expect(lgamma(-2)).toBe(Number.POSITIVE_INFINITY);
    expect(lgamma(NaN)).toBeNaN();
    expect(lgamma(1e-310)).toBeCloseTo(-Math.log(1e-310));
  });

  it("stays finite where gamma overflows", () => {
    expect(lgamma(171)).toBeCloseTo(706.573062245787);
    expect(lgamma(1001)).toBeCloseTo(5912.128178, 1);
    expect(isFinite(lgamma(1000))).toBe(true);
    expect(isFinite(lgamma(1e10))).toBe(true);
    expect(isFinite(lgamma(1e18))).toBe(true);
  });

  // R 4.6.0: lgamma(2.5e305) = 1.7555118602376454e308, lgamma(2.54e305) = Inf (xmax cutoff).
  it("overflows at R's xmax rather than at DBL_MAX", () => {
    expect(Math.abs(lgamma(2.5e305) / 1.7555118602376454e308 - 1)).toBeLessThan(1e-15);
    expect(lgamma(2.54e305)).toBe(Number.POSITIVE_INFINITY);
  });
});

describe("gamma support functions", () => {
  it("lgamma1p agrees with lgamma(1 + a) and is accurate near zero", () => {
    expect(lgamma1p(0.75)).toBeCloseTo(lgamma(1.75), 12);
    expect(lgamma1p(-0.25)).toBeCloseTo(lgamma(0.75), 12);
    expect(Math.abs(lgamma1p(0))).toBe(0);
    expect(lgamma1p(1e-8)).toBeCloseTo(-0.5772156649015329e-8, 15);
  });

  it("lgammaCorrection rejects x below 10 and decays like 1/(12x)", () => {
    expect(() => lgammaCorrection(9.99)).toThrow();
    expect(lgammaCorrection(10)).toBeCloseTo(0.008330563433362871, 12);
    expect(lgammaCorrection(1e9)).toBe(1 / (1e9 * 12));
  });

  it("stirlingError uses the half-integer table, direct formula and series", () => {
    expect(stirlingError(0.5)).toBe(0.1534264097200273452913848);
    expect(stirlingError(15)).toBe(0.005554733551962801371038690);
    expect(stirlingError(2.25)).toBeCloseTo(lgamma(3.25) - ((2.25 + 0.5) * Math.log(2.25) - 2.25 + 0.918938533204672741780329736406), 12);
    expect(stirlingError(100.5)).toBeCloseTo(1 / (12 * 100.5), 6);
    expect(stirlingError(1e8)).toBeCloseTo(1 / (12 * 1e8), 12);
  });

  it("sinpi is exact at half-integers and NaN for non-finite input", () => {
    expect(sinpi(0)).toBe(0);
    expect(sinpi(1)).toBe(0);
    expect(sinpi(2)).toBe(0);
    expect(sinpi(0.5)).toBe(1);
    expect(sinpi(-0.5)).toBe(-1);
    expect(sinpi(2.5)).toBe(1);
    expect(sinpi(0.25)).toBeCloseTo(Math.SQRT1_2, 15);
    expect(sinpi(NaN)).toBeNaN();
    expect(sinpi(Infinity)).toBeNaN();
  });

  it("log1pmx matches log1p(x) - x on its direct and continued-fraction branches", () => {
    expect(log1pmx(2)).toBe(Math.log1p(2) - 2);
    expect(log1pmx(-0.9)).toBe(Math.log1p(-0.9) + 0.9);
    expect(log1pmx(0.5)).toBeCloseTo(Math.log1p(0.5) - 0.5, 15);
    expect(log1pmx(0.05)).toBeCloseTo(Math.log1p(0.05) - 0.05, 15);
    expect(log1pmx(0)).toBe(0);
  });

  // Finding 27: the small-x polynomial follows R's coefficient order.
  it("log1pmx small-x polynomial agrees with the series -x^2/2 + x^3/3 - ... to 1e-13 relative", () => {
    // 1e-2 itself takes the continued-fraction branch, so both sides of the boundary are checked.
    const xs = [1e-2, 9.9e-3, 5e-3, 1e-3, 1e-4, 1e-5, 1e-6, -1e-2, -9.9e-3, -5e-3, -1e-3, -1e-4, -1e-6];
    for (let i = 0; i < xs.length; i++) {
      const x = xs[i];
      let reference = 0;
      for (let k = 12; k >= 2; k--) {
        reference += (k % 2 === 0 ? -1 : 1) * Math.pow(x, k) / k;
      }
      expect(Math.abs((log1pmx(x) - reference) / reference), `x=${x}`).toBeLessThan(1e-13);
    }
  });

  it("chebyshevPolynomial evaluates series and rejects out-of-range input", () => {
    expect(chebyshevPolynomial(0.5, [2, 0, 0], 3)).toBe(1);
    expect(chebyshevPolynomial(0.5, [0, 1, 0], 3)).toBe(0.5);
    expect(chebyshevPolynomial(0.5, [0, 0, 1], 3)).toBeCloseTo(-0.5, 15);
    expect(() => chebyshevPolynomial(1.2, [1], 1)).toThrow();
    expect(() => chebyshevPolynomial(0, [1], 0)).toThrow();
  });

  it("ldexp scales by powers of two exactly", () => {
    expect(ldexp(3, 4)).toBe(48);
    expect(ldexp(3, -1)).toBe(1.5);
    expect(ldexp(1, 1023)).toBe(Math.pow(2, 1023));
  });
});
