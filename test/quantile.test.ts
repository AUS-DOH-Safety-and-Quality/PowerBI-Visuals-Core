import { describe, expect, it } from "vitest";
import { quantile } from "../src/math/index";

// Linear interpolation between order statistics: R's type 7
describe("quantile", () => {
  it("interpolates like R's default quantile type", () => {
    expect(quantile([1, 2, 3, 4], 0.25)).toBe(1.75);
    expect(quantile([1, 2, 3, 4], 0.5)).toBe(2.5);
    expect(quantile([2, 7], 0.1)).toBe(2.5);
    expect(quantile([1, 1, 2, 3, 4, 5, 6, 9], 0.1)).toBe(1);
    expect(quantile([1, 1, 2, 3, 4, 5, 6, 9], 0.9)).toBeCloseTo(6.9, 12);
  });

  it("returns the end points at q = 0 and q = 1, a lone value for any q, and nothing for no values", () => {
    expect(quantile([3, 8, 9], 0)).toBe(3);
    expect(quantile([3, 8, 9], 1)).toBe(9);
    expect(quantile([5], 0.3)).toBe(5);
    expect(quantile([], 0.5)).toBeUndefined();
  });
});
