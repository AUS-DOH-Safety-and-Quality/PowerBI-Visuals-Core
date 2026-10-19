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

  // 60-digit mpmath references: R's own lgamma difference cancels at these sizes
  it.each([
    [1000, 0.9997497811015132, 0.022369067648796488],
    [3e4, 0.99999166642360561, 0.0040825339362065013],
    [1e6, 0.99999974999978125, 0.00070710704635167333],
    [1e8, 0.99999999749999998, 7.0710678383819796e-5],
    [1e12, 0.99999999999975, 7.0710678118681269e-7]
  ])("keeps c4 and c5 accurate for large n = %s", (n, expectedC4, expectedC5) => {
    expect(Math.abs(c4(n) / expectedC4 - 1)).toBeLessThan(1e-14);
    expect(Math.abs(c5(n) / expectedC5 - 1)).toBeLessThan(1e-13);
  });

  it("approaches one from below as the sample grows", () => {
    expect(c4(1000)).toBeLessThan(1);
    expect(c4(1000)).toBeGreaterThan(c4(100));
    expect(c4(1e6)).toBeCloseTo(1, 6);
  });
});
