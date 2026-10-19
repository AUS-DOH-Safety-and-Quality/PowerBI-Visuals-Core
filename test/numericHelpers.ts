import { expect } from "vitest";

/** Relative comparison against an R reference; use `toBe` for exact zeros and non-finite values. */
export function expectRel(actual: number, expected: number, tol: number): void {
  expect(Math.abs(actual / expected - 1), `${actual} vs ${expected}`).toBeLessThan(tol);
}
