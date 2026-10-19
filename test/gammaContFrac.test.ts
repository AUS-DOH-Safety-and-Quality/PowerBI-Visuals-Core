import { describe, expect, it } from "vitest";
import { gammaCDF } from "../src/math/index";
import gammaContFrac from "../src/math/gammaContFrac";
import { expectRel } from "./numericHelpers";

// pd_lower_cf is reached from pgamma_raw's lower series: directly for alpha < 1, and for the
// fractional remainder y < 1 of non-integer alpha > 1. References: R 4.6.1 pgamma, %.17g.
describe("gammaContFrac via gammaCDF", () => {
  it("evaluates the continued fraction for alpha < 1 (convergent rescaling branch)", () => {
    expectRel(gammaCDF(1.5, 0.3, 1, false, false), 0.042109463295889389, 1e-14);
    expectRel(gammaCDF(1.5, 0.3, 1, true, false), 0.95789053670411062, 1e-14);
  });

  it("evaluates the fractional remainder for non-integer alpha > 1", () => {
    expectRel(gammaCDF(10, 3.5, 1, true, false), 0.99443031692705441, 1e-14);
    expectRel(gammaCDF(10, 3.5, 1, false, true), -5.1904171255943226, 1e-14);
  });

  it("returns y / d when y is within d * eps of 1", () => {
    // y = 0.5 remainder of alpha = 2.5 against d ~ 1e78
    expectRel(gammaCDF(1e78, 2.5, 1, false, true), -1e78, 1e-14);
  });

  it("skips the continued fraction when x * eps exceeds 1 - alpha", () => {
    expectRel(gammaCDF(1e20, 0.5, 1, false, true), -1e20, 1e-14);
    expectRel(gammaCDF(10, 1 - 2 ** -53, 1, false, false), 4.5399929762484841e-05, 1e-14);
  });
});

describe("gammaContFrac guards", () => {
  // Identity with R: pd_lower_cf(y, d) = Q(y, x) * gamma(y + 1) * exp(x) / x^y, x = d + y - 1,
  // with Q = pgamma(x, y, lower.tail = FALSE). Neither y = 0 nor y > d is reachable through gammaCDF.
  it("returns 0 for y = 0", () => {
    expect(gammaContFrac(0, 5)).toBe(0);
  });

  it("matches the incomplete gamma identity, including y > d where f0 is clamped", () => {
    expectRel(gammaContFrac(2, 1), 1.5000000000000002, 1e-14);
    expectRel(gammaContFrac(0.5, 3), 0.17307851730302071, 1e-14);
    expectRel(gammaContFrac(3.5, 2), 1.3685331419133795, 1e-14);
    expectRel(gammaContFrac(0.3, 2.2), 0.14997343146832415, 1e-14);
  });
});
