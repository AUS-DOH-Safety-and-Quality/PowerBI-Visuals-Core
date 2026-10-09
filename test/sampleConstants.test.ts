import { describe, expect, it } from "vitest";
import { c4, c5, a3 } from "../src/math/index";

// c4(n) = sqrt(2/(n-1)) Γ(n/2) / Γ((n-1)/2), evaluated in R 4.6.1; c5 and A3 follow from it
describe("sample constants", () => {
  it.each([
    [2, 0.797884560803, 0.602810274989, 2.65868077636],
    [5, 0.939985602987, 0.341214106065, 1.42729929292],
    [10, 0.972659274122, 0.232236811176, 0.975350077145],
    [25, 0.989640375586, 0.143568544642, 0.606280841811]
  ])("n = %s gives c4 %s, c5 %s and A3 %s", (n, expectedC4, expectedC5, expectedA3) => {
    expect(c4(n)).toBeCloseTo(expectedC4, 11);
    expect(c5(n)).toBeCloseTo(expectedC5, 11);
    expect(a3(n)).toBeCloseTo(expectedA3, 11);
  });

  it("approaches one from below as the sample grows", () => {
    expect(c4(1000)).toBeLessThan(1);
    expect(c4(1000)).toBeGreaterThan(c4(100));
    expect(c4(1e6)).toBeCloseTo(1, 6);
  });
});
