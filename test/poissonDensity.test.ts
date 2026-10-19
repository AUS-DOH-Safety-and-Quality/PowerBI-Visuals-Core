import { describe, expect, it } from "vitest";
import { poissonDensity } from "../src/math/index";
import { expectRel } from "./numericHelpers";

// References: R 4.6.1 dpois(x, lambda, log), %.17g.
describe("poissonDensity guards", () => {
  it("is a point mass at 0 when lambda = 0", () => {
    expect(poissonDensity(0, 0, false)).toBe(1);
    expect(poissonDensity(0, 0, true)).toBe(0);
    expect(poissonDensity(1, 0, false)).toBe(0);
    expect(poissonDensity(1, 0, true)).toBe(Number.NEGATIVE_INFINITY);
  });

  it("is 0 for infinite lambda, infinite x and negative x", () => {
    expect(poissonDensity(1, Number.POSITIVE_INFINITY, false)).toBe(0);
    expect(poissonDensity(Number.POSITIVE_INFINITY, 1, false)).toBe(0);
    expect(poissonDensity(-1, 1, false)).toBe(0);
    expect(poissonDensity(-1, 1, true)).toBe(Number.NEGATIVE_INFINITY);
  });

  it("uses the direct log formula when lambda < x * DBL_MIN", () => {
    expectRel(poissonDensity(1e10, 1e-300, true), -7128013788293.9727, 1e-14);
    expect(poissonDensity(1e10, 1e-300, false)).toBe(0);
  });

  it("switches to sqrt(2 pi) sqrt(x) once 2 pi x would overflow", () => {
    expectRel(poissonDensity(1e308, 9e307, true), -5.3605156578262224e+305, 1e-14);
    expectRel(poissonDensity(5e307, 4e307, true), -1.1571775657104959e+306, 1e-14);
    expect(poissonDensity(1e308, 9e307, false)).toBe(0);
  });

  it("returns -Inf where ebd0 overflows, as R does", () => {
    expect(poissonDensity(1.7e308, 1e300, true)).toBe(Number.NEGATIVE_INFINITY);
    expect(poissonDensity(1.7e308, 1e300, false)).toBe(0);
    expect(poissonDensity(1.7e308, 3e307, true)).toBe(Number.NEGATIVE_INFINITY);
    expect(poissonDensity(1.5e308, 6e307, true)).toBe(Number.NEGATIVE_INFINITY);
  });
});
