import { describe, expect, it } from "vitest";
import {
  gamma, lgamma, lgamma1p, lgammaCorrection, stirlingError, chebyshevPolynomial, sinpi, log1pmx, ldexp
} from "../src/math/index";
import { expectRel } from "./numericHelpers";

// References from R 4.6.1 printed with sprintf("%.17g", ...) unless stated otherwise.
describe("gamma", () => {
  it("returns factorials for positive integers", () => {
    const factorials: readonly number[] = [1, 1, 2, 6, 24, 120, 720, 5040, 40320, 362880];
    for (let i = 0; i < factorials.length; i++) {
      expectRel(gamma(i + 1), factorials[i], 1e-15);
    }
  });

  it("returns half-integer and non-integer values", () => {
    expectRel(gamma(0.5), 1.7724538509055161, 1e-15);
    expectRel(gamma(1.5), 0.88622692545275805, 1e-15);
    expectRel(gamma(2.5), 1.329340388179137, 1e-15);
    expectRel(gamma(3.5), 3.3233509704478426, 1e-15);
    expectRel(gamma(4.5), 11.63172839656745, 1e-15);
  });

  it("handles small positive inputs", () => {
    expectRel(gamma(0.1), 9.5135076986687306, 1e-15);
    expectRel(gamma(0.01), 99.432585119150602, 1e-15);
    expectRel(gamma(1e-10), 9999999999.4227829, 1e-15);
  });

  it("handles negative non-integers by reflection", () => {
    expectRel(gamma(-0.5), -3.5449077018110322, 1e-15);
    expectRel(gamma(-1.5), 2.3632718012073548, 1e-15);
  });

  it("returns NaN at poles and for NaN", () => {
    expect(gamma(0)).toBeNaN();
    expect(gamma(-1)).toBeNaN();
    expect(gamma(-2)).toBeNaN();
    expect(gamma(-10)).toBeNaN();
    expect(gamma(NaN)).toBeNaN();
  });

  it("approaches overflow with relative accuracy and overflows beyond it", () => {
    expectRel(gamma(171), 7.2574156153088822e+306, 1e-14);
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
    expect(lgamma(1)).toBe(0);
    expect(lgamma(2)).toBe(0);
    expectRel(lgamma(3), 0.69314718055994529, 1e-15);
    expectRel(lgamma(4), 1.791759469228055, 1e-15);
    expectRel(lgamma(5), 3.1780538303479458, 1e-15);
    expectRel(lgamma(6), 4.7874917427820458, 1e-15);
    expectRel(lgamma(10), 12.801827480081469, 1e-15);
    expectRel(lgamma(0.5), 0.57236494292470008, 1e-15);
    expectRel(lgamma(1.5), -0.12078223763524518, 1e-15);
  });

  it("handles small, negative and special inputs", () => {
    expectRel(lgamma(0.1), 2.252712651734206, 1e-15);
    expectRel(lgamma(0.01), 4.5994798780420219, 1e-15);
    expectRel(lgamma(-0.5), 1.2655121234846454, 1e-15);
    expectRel(lgamma(-1.5), 0.86004701537648109, 1e-15);
    expect(lgamma(0)).toBe(Number.POSITIVE_INFINITY);
    expect(lgamma(-1)).toBe(Number.POSITIVE_INFINITY);
    expect(lgamma(-2)).toBe(Number.POSITIVE_INFINITY);
    expect(lgamma(NaN)).toBeNaN();
    expectRel(lgamma(1e-310), 713.80137882815416, 1e-15);
  });

  it("stays finite where gamma overflows", () => {
    expectRel(lgamma(171), 706.57306224578747, 1e-15);
    expectRel(lgamma(1001), 5912.1281784881639, 1e-15);
    expect(isFinite(lgamma(1000))).toBe(true);
    expect(isFinite(lgamma(1e10))).toBe(true);
    expect(isFinite(lgamma(1e18))).toBe(true);
  });

  // R 4.6.0: lgamma(2.5e305) = 1.7555118602376454e308, lgamma(2.54e305) = Inf (xmax cutoff).
  it("overflows at R's xmax rather than at DBL_MAX", () => {
    expectRel(lgamma(2.5e305), 1.7555118602376454e308, 1e-15);
    expect(lgamma(2.54e305)).toBe(Number.POSITIVE_INFINITY);
  });
});

describe("gamma support functions", () => {
  it("lgamma1p agrees with lgamma(1 + a) and is accurate near zero", () => {
    expectRel(lgamma1p(0.75), -0.084401121020485553, 1e-15);
    expectRel(lgamma1p(-0.25), 0.20328095143129538, 1e-15);
    expect(Math.abs(lgamma1p(0))).toBe(0);
    // Taylor series -γa + ζ(2)a²/2 - ζ(3)a³/3; the next term is 5e-25 relative
    expectRel(lgamma1p(1e-8), -5.7721565667686258e-09, 1e-15);
  });

  it("lgammaCorrection decays like 1/(12x)", () => {
    // R's lgammacor truncates its Chebyshev series at 5 terms, which sits 4.4e-15 above the exact
    // Stirling sum 0.0083305634333628691; the reference is R's own 5-term evaluation.
    expectRel(lgammaCorrection(10), 0.0083305634333629055, 1e-15);
    expect(lgammaCorrection(1e9)).toBe(1 / (1e9 * 12));
  });

  it("stirlingError uses the half-integer table, direct formula and series", () => {
    expect(stirlingError(0.5)).toBe(0.1534264097200273452913848);
    expect(stirlingError(15)).toBe(0.005554733551962801371038690);
    // R: lgamma(3.25) - ((2.25 + 0.5) * log(2.25) - 2.25 + log(sqrt(2 * pi)))
    expectRel(stirlingError(2.25), 0.036805303309148441, 1e-14);
    // Stirling series Σ B₂ₖ / (2k(2k-1) n^(2k-1)) to k = 8, converged to double precision here
    expectRel(stirlingError(100.5), 0.00082918465990464857, 1e-15);
    expectRel(stirlingError(1e8), 8.3333333333333325e-10, 1e-15);
  });

  it("sinpi is exact at half-integers and NaN for non-finite input", () => {
    expect(sinpi(0)).toBe(0);
    expect(sinpi(1)).toBe(0);
    expect(sinpi(2)).toBe(0);
    expect(sinpi(0.5)).toBe(1);
    expect(sinpi(-0.5)).toBe(-1);
    expect(sinpi(2.5)).toBe(1);
    expectRel(sinpi(0.25), 0.70710678118654746, 1e-15);
    expect(sinpi(NaN)).toBeNaN();
    expect(sinpi(Infinity)).toBeNaN();
  });

  it("log1pmx matches log1p(x) - x on its direct and continued-fraction branches", () => {
    expect(log1pmx(2)).toBe(Math.log1p(2) - 2);
    expect(log1pmx(-0.9)).toBe(Math.log1p(-0.9) + 0.9);
    // Taylor series Σ (-1)^(k+1) x^k / k summed in R; log1p(x) - x itself loses ~1e-15 to cancellation
    expectRel(log1pmx(0.5), -0.094534891891835615, 1e-15);
    expectRel(log1pmx(0.05), -0.0012098358305679972, 1e-15);
    expect(log1pmx(0)).toBe(0);
  });

  // The small-x polynomial follows R's coefficient order.
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

  it("chebyshevPolynomial evaluates series", () => {
    expect(chebyshevPolynomial(0.5, [2, 0, 0], 3)).toBe(1);
    expect(chebyshevPolynomial(0.5, [0, 1, 0], 3)).toBe(0.5);
    expect(chebyshevPolynomial(0.5, [0, 0, 1], 3)).toBeCloseTo(-0.5, 15);
  });

  it("ldexp scales by powers of two exactly", () => {
    expect(ldexp(3, 4)).toBe(48);
    expect(ldexp(3, -1)).toBe(1.5);
    expect(ldexp(1, 1023)).toBe(Math.pow(2, 1023));
  });
});
