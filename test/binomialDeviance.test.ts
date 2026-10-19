import { describe, expect, it } from "vitest";
import { binomialDeviance, poissonDensity } from "../src/math/index";
import { expectRel } from "./numericHelpers";

// ebd0 returns bd0(x, M) = x log(x / M) + M - x as an unevaluated sum yh + yl.
// R exposes it only through dpois, so the guards are checked against the closed form and dpois.
describe("binomialDeviance", () => {
  it("handles the trivial arguments without evaluating the table", () => {
    expect(binomialDeviance(5, 5)).toEqual({ yh: 0, yl: 0 });
    expect(binomialDeviance(0, 5)).toEqual({ yh: 5, yl: 0 });
    expect(binomialDeviance(5, 0)).toEqual({ yh: Number.POSITIVE_INFINITY, yl: 0 });
    // M / x overflows: the x log(x / M) term is negligible against M
    expect(binomialDeviance(1e-310, 1e10)).toEqual({ yh: 1e10, yl: 0 });
  });

  it("returns +Inf when the scaled logarithm would overflow", () => {
    // exponent guard: log2(M / x) ~ -1053 against DBL_MAX / x ~ 18
    expect(binomialDeviance(1e307, 1e-10)).toEqual({ yh: Number.POSITIVE_INFINITY, yl: 0 });
    // fg = f * 2^-(e + 10) overflows for M / x ~ 2^-1036
    expect(binomialDeviance(1, 1e-312)).toEqual({ yh: Number.POSITIVE_INFINITY, yl: 0 });
    // e = -2 passes the exponent guard but x * log(2) * |e| overflows inside the table loop
    expect(binomialDeviance(1.7e308, 3e307)).toEqual({ yh: Number.POSITIVE_INFINITY, yl: 0 });
  });

  it("matches the closed form away from the guards", () => {
    // R: 5 * log(5 / 3) + 3 - 5
    const dev = binomialDeviance(5, 3);
    expectRel(dev.yh + dev.yl, 0.55412811882995339, 1e-14);
  });

  it("returns only the log1pmx term when the table scale fg is exactly 1 (M / x within 0.2% of 1)", () => {
    // d = M - x = 1: bd0 = d^2 / (2x) - d^3 / (3x^2) + d^4 / (4x^3), evaluated in R
    const dev = binomialDeviance(1e6, 1e6 + 1);
    expect(dev.yh).toBe(0);
    expectRel(dev.yl, 4.9999966666691662e-07, 1e-14);
    // R 4.6.1 dpois
    expectRel(poissonDensity(1000, 999.5, false), 0.0126130340951102, 1e-14);
    expectRel(poissonDensity(1000, 1000.5, false), 0.012613035146196577, 1e-14);
  });
});
