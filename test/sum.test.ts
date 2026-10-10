import { describe, expect, it } from "vitest";
import { sum } from "../src/math/index";

describe("sum", () => {
  it("sums readonly input without changing it", () => {
    const values = Object.freeze([1, -2, 3.5]);
    expect(sum(values)).toBe(2.5);
    expect(values).toEqual([1, -2, 3.5]);
  });

  it("returns zero for empty input", () => {
    expect(sum([])).toBe(0);
  });

  // By design: realistic data never cancels like this, and compensation would shift every result by rounding noise
  it("adds left to right without compensating for cancellation", () => {
    expect(sum([1e16, -1e16, 1])).toBe(1);
    expect(sum([1e16, 1, -1e16])).toBe(0);
  });

  it("preserves non-finite results and signed-zero behaviour", () => {
    expect(sum([1, Infinity])).toBe(Infinity);
    expect(sum([-Infinity, 1])).toBe(-Infinity);
    expect(sum([Infinity, -Infinity])).toBeNaN();
    expect(sum([NaN])).toBeNaN();
    expect(Object.is(sum([-0]), 0)).toBe(true);
  });
});
