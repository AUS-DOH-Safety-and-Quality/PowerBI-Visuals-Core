import { describe, expect, it } from "vitest";
import { frexp } from "../src/math/index";
import { gammaDensity } from "../src/math/index";
import { gammaCDF } from "../src/math/index";
import { gammaQuantile } from "../src/math/index";
import { chisqCDF } from "../src/math/index";
import { poissonDensity } from "../src/math/index";

/** Reference values from R 4.6.0. Tolerances are relative. */
function expectRel(actual: number, expected: number, tol: number): void {
  expect(Math.abs(actual / expected - 1), `${actual} vs ${expected}`).toBeLessThan(tol);
}

describe("alignment with R nmath edge cases", () => {
  it("uses DBL_MIN, not the smallest subnormal, for the Poisson and gamma cutoffs", () => {
    expectRel(gammaDensity(1, 1e-308, 1, false), 3.6787944117144211e-309, 1e-14);
    expectRel(gammaDensity(1, 1e-308, 1, true), -710.19620864216608, 1e-14);
    expect(gammaQuantile(0.75, 0.001, 2, false)).toBe(0);
    expect(gammaQuantile(0.9, 0.001, 2, false)).toBe(0);
    expectRel(gammaCDF(50, 500, 1, true, false), 5.3643869635230903e-307, 1e-14);
    expectRel(gammaCDF(1000, 100, 1, false, false), 6.0358275296316284e-294, 1e-14);
  });

  it("scales dpois_wrap in the requested space", () => {
    expectRel(gammaCDF(200, 0.5, 1, false, false), 5.5072482372124689e-89, 1e-14);
    expectRel(gammaCDF(1, 0.1, 1, true, false), 0.97587265627367226, 1e-14);
    expectRel(chisqCDF(500, 1, false, false), 9.5053977665540927e-111, 1e-14);
    expectRel(chisqCDF(3.84, 1, true, false), 0.94995647875129474, 1e-14);
    expectRel(poissonDensity(5, 3, false), 0.10081881344492449, 1e-14);
    expectRel(gammaCDF(0.5, 0.001, 1, false, true), -7.4874547519064638, 1e-14);
  });

  it("matches pgamma, pchisq and dpois away from the edges", () => {
    // R 4.6.1: pgamma(x, shape, scale = scale, lower.tail, log.p), arguments in the same order
    expectRel(gammaCDF(2, 2, 1, true, false), 0.59399415029016189, 1e-14);
    expectRel(gammaCDF(1, 0.5, 1, true, false), 0.84270079294971556, 1e-14);
    expectRel(gammaCDF(5, 3, 2, true, false), 0.45618688411667041, 1e-14);
    expectRel(gammaCDF(5, 3, 2, false, false), 0.54381311588332959, 1e-14);
    expectRel(gammaCDF(5, 3, 2, true, true), -0.78485271983740823, 1e-14);
    expectRel(gammaCDF(5, 3, 2, false, true), -0.609149628127714, 1e-14);
    // R 4.6.1: pchisq(x, df, lower.tail)
    expectRel(chisqCDF(3.841459, 1, true, false), 0.95000000534680429, 1e-14);
    expectRel(chisqCDF(10, 5, true, false), 0.92476475385348778, 1e-14);
    expectRel(chisqCDF(10, 5, false, false), 0.075235246146512197, 1e-14);
    expectRel(chisqCDF(23.20925, 10, false, false), 0.010000003995074247, 1e-14);
    // R 4.6.1: dpois(x, lambda, log)
    expectRel(poissonDensity(10, 3, false), 0.0008101511794681432, 1e-14);
    expectRel(poissonDensity(0, 2.5, false), 0.0820849986238988, 1e-14);
    expectRel(poissonDensity(1000, 1000, false), 0.012614611348721503, 1e-14);
    expectRel(poissonDensity(10, 3, true), -7.1182896863944185, 1e-14);
    expectRel(poissonDensity(1000, 1000, true), -4.3728995060262967, 1e-14);
    expectRel(poissonDensity(0, 2.5, true), -2.5, 1e-14);
  });

  it("frexp handles the top binade, subnormals and signs", () => {
    const top = frexp(1.5e308);
    expect(top.exponent).toBe(1024);
    expect(top.mantissa).toBeGreaterThanOrEqual(0.5);
    expect(top.mantissa).toBeLessThan(1);
    expect(top.mantissa * Math.pow(2, 1023) * 2).toBe(1.5e308);
    expect(frexp(1)).toEqual({ mantissa: 0.5, exponent: 1 });
    expect(frexp(-3)).toEqual({ mantissa: -0.75, exponent: 2 });
    expect(frexp(5e-324)).toEqual({ mantissa: 0.5, exponent: -1073 });
  });
});
