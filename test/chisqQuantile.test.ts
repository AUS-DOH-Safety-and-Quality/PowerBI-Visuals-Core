import { describe, expect, it } from "vitest";
import { chisqQuantile } from "../src/math/index";

// Reference values from R 4.6.1 qchisq
describe("chisqQuantile", () => {
  it("matches qchisq across degrees of freedom", () => {
    expect(chisqQuantile(0.95, 1)).toBeCloseTo(3.841459, 6);
    expect(chisqQuantile(0.5, 3)).toBeCloseTo(2.365974, 6);
    expect(chisqQuantile(0.99, 10)).toBeCloseTo(23.20925, 5);
    expect(chisqQuantile(0.975, 30)).toBeCloseTo(46.97924, 5);
    expect(chisqQuantile(0.001, 0.5) / 1.349940e-12).toBeCloseTo(1, 6);
  });

  it("supports the upper tail and log probabilities", () => {
    expect(chisqQuantile(0.05, 1, false)).toBeCloseTo(3.841459, 6);
    expect(chisqQuantile(Math.log(0.95), 2, true, true)).toBeCloseTo(5.991465, 6);
  });

  it("returns the support bounds at p = 0 and p = 1 and NaN outside [0, 1]", () => {
    expect(chisqQuantile(0, 2)).toBe(0);
    expect(chisqQuantile(1, 2)).toBe(Number.POSITIVE_INFINITY);
    expect(chisqQuantile(-0.1, 2)).toBeNaN();
    expect(chisqQuantile(1.1, 2)).toBeNaN();
  });
});
