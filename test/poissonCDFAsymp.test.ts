import { describe, expect, it } from "vitest";
import { gammaCDF, chisqCDF } from "../src/math/index";
import { expectRel } from "./numericHelpers";

// pgamma_raw takes the ppois_asymp branch once x and alpha are both large and within ~20% of each
// other, e.g. x >= 0.8 (alpha + 50) for x <= alpha - 1. Funnels' indirectly standardised ratio reaches
// it through pchisq(2 * ratio * n, 2 * n, log.p = TRUE) for denominators n of a few hundred and up.
// References: R 4.6.1 pgamma(x, shape, lower.tail, log.p) / pchisq(x, df, log.p), %.17g.
describe("poissonCDFAsymp via gammaCDF", () => {
  it("matches R on the natural scale in both tails", () => {
    expectRel(gammaCDF(1000, 1001, 1, true, false), 0.49159063283149401, 1e-14);
    expectRel(gammaCDF(1000, 1001, 1, false, false), 0.50840936716850604, 1e-14);
    expectRel(gammaCDF(1100, 1001, 1, true, false), 0.99882476943186349, 1e-14);
    expectRel(gammaCDF(900, 1001, 1, false, false), 0.99950936726714235, 1e-14);
    // ppois(x, lambda) = pgamma(lambda, x + 1, lower.tail = !lower.tail): ppois(999, 1000), ppois(1050, 1000, FALSE)
    expectRel(gammaCDF(1000, 1000, 1, false, false), 0.49579475581978449, 1e-14);
    expectRel(gammaCDF(1000, 1000, 1, true, false), 0.50420524418021551, 1e-14);
    expectRel(gammaCDF(1000, 1051, 1, true, false), 0.056028838363673381, 1e-14);
  });

  it("saturates to 1 on the natural scale far out in the wrong tail", () => {
    expect(gammaCDF(11100, 10001, 1, true, false)).toBe(1);
    expect(gammaCDF(8900, 10001, 1, false, false)).toBe(1);
  });

  it("matches R in log space for small deviations (phi / Phi ratio branch)", () => {
    expectRel(gammaCDF(1000, 1001, 1, true, true), -0.71010895592359791, 1e-14);
    expectRel(gammaCDF(1000, 1001, 1, false, true), -0.67646831503620675, 1e-14);
    // lambda < x: negative signed root deviance
    expectRel(gammaCDF(1100, 1001, 1, true, true), -0.0011759216931212328, 1e-14);
    expectRel(gammaCDF(1100, 1001, 1, false, true), -6.7462909224349268, 1e-14);
    // lambda > x: positive signed root deviance, flipped inside the log branch
    expectRel(gammaCDF(900, 1001, 1, true, true), -7.6198147083134007, 1e-14);
    expectRel(gammaCDF(900, 1001, 1, false, true), -0.00049075313247981035, 1e-14);
  });

  it("matches R in log space beyond 10 sigma, where exp(log Phi) underflows (series branch)", () => {
    expectRel(gammaCDF(11100, 10001, 1, false, true), -59.620415209362676, 1e-14);
    expectRel(gammaCDF(8900, 10001, 1, true, true), -68.779652834143306, 1e-14);
    // The other tail at the same points stays on the ratio branch
    expectRel(gammaCDF(11100, 10001, 1, true, true), -1.2799195296348502e-26, 1e-14);
    expectRel(gammaCDF(8900, 10001, 1, false, true), -1.3470270187334944e-30, 1e-14);
  });

  it("matches pchisq(..., log.p = TRUE) as used for the indirectly standardised ratio", () => {
    expectRel(chisqCDF(900, 1000, true, true), -4.5359017972724551, 1e-14);
    expectRel(chisqCDF(1000, 1000, true, true), -0.68132306935837561, 1e-14);
    expectRel(chisqCDF(1100, 1000, true, true), -0.014722250580850726, 1e-14);
    expectRel(chisqCDF(1200, 1000, false, true), -11.309499650376674, 1e-14);
    expectRel(chisqCDF(202000, 200000, true, true), -0.00080874846181709268, 1e-14);
  });
});
