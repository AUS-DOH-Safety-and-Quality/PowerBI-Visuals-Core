import { gammaQuantile } from "../src/math/index";
import { describe, it, expect } from "vitest";
import { expectRel } from "./numericHelpers";

describe("gammaQuantile", () => {
    // Reference values from R's qgamma(p, shape, scale = scale)

    describe("basic functionality", () => {
        it("should return correct quantiles for standard cases", () => {
            expect(gammaQuantile(0.5, 1, 1)).toBeCloseTo(0.6931472, 5);
            expect(gammaQuantile(0.5, 2, 1)).toBeCloseTo(1.678347, 5);
            expect(gammaQuantile(0.5, 5, 2)).toBeCloseTo(9.341818, 4);
        });

        it("should return correct quantiles for various probabilities", () => {
            expect(gammaQuantile(0.1, 2, 1)).toBeCloseTo(0.5318116, 5);
            expect(gammaQuantile(0.25, 2, 1)).toBeCloseTo(0.9612813, 5);
            expect(gammaQuantile(0.75, 2, 1)).toBeCloseTo(2.692633, 5);
            expect(gammaQuantile(0.9, 2, 1)).toBeCloseTo(3.889720, 5);
            expect(gammaQuantile(0.95, 2, 1)).toBeCloseTo(4.743864, 5);
            expect(gammaQuantile(0.99, 2, 1)).toBeCloseTo(6.638352, 4);
        });
    });

    describe("edge cases", () => {
        it("should return 0 for p = 0 (lower tail)", () => {
            expect(gammaQuantile(0, 2, 1, true)).toBe(0);
            expect(gammaQuantile(0, 5, 2, true)).toBe(0);
        });

        it("should return Infinity for p = 1 (lower tail)", () => {
            expect(gammaQuantile(1, 2, 1, true)).toBe(Number.POSITIVE_INFINITY);
        });

        it("should return Infinity for p = 0 (upper tail)", () => {
            expect(gammaQuantile(0, 2, 1, false)).toBe(Number.POSITIVE_INFINITY);
        });

        it("should return 0 for p = 1 (upper tail)", () => {
            expect(gammaQuantile(1, 2, 1, false)).toBe(0);
        });

        it("should return NaN for invalid probabilities", () => {
            expect(gammaQuantile(-0.1, 2, 1)).toBeNaN();
            expect(gammaQuantile(1.1, 2, 1)).toBeNaN();
        });

        it("should return NaN for scale = 0", () => {
            expect(gammaQuantile(0.5, 2, 0)).toBeNaN();
        });
    });

    describe("extreme probabilities", () => {
        it("should handle very small probabilities", () => {
            expect(gammaQuantile(1e-10, 2, 1) / 1.414220e-5).toBeCloseTo(1, 6);
        });

        it("should handle probabilities very close to 1", () => {
            expect(gammaQuantile(1 - 1e-10, 2, 1)).toBeCloseTo(26.33398, 4);
        });

        it("should handle log-scale probabilities", () => {
            // log(0.5) = -0.6931472
            expect(gammaQuantile(-0.6931472, 2, 1, true, true)).toBeCloseTo(1.678347, 4);

            // log(1e-100) = -230.2585
            expect(gammaQuantile(-230.2585, 2, 1, true, true) / 1.414220e-50).toBeCloseTo(1, 6);
        });
    });

    describe("upper tail", () => {
        it("should return correct upper tail quantiles", () => {
            expect(gammaQuantile(0.05, 2, 1, false)).toBeCloseTo(gammaQuantile(0.95, 2, 1, true), 5);
            expect(gammaQuantile(0.1, 2, 1, false)).toBeCloseTo(gammaQuantile(0.9, 2, 1, true), 5);
        });
    });

    describe("scale parameter", () => {
        it("should scale quantiles correctly", () => {
            const q1 = gammaQuantile(0.5, 2, 1);
            const q2 = gammaQuantile(0.5, 2, 2);
            const q3 = gammaQuantile(0.5, 2, 0.5);

            expect(q2).toBeCloseTo(2 * q1, 5);
            expect(q3).toBeCloseTo(0.5 * q1, 5);
        });
    });

    describe("numerical accuracy for various shape parameters", () => {
        it("should be accurate for small shape (alpha < 1)", () => {
            expect(gammaQuantile(0.5, 0.5, 1)).toBeCloseTo(0.2274682, 4);
            expect(gammaQuantile(0.5, 0.1, 1)).toBeCloseTo(0.0005934, 5);
        });

        it("should be accurate for large shape", () => {
            expect(gammaQuantile(0.5, 100, 1)).toBeCloseTo(99.66687, 3);
            expect(gammaQuantile(0.5, 50, 2)).toBeCloseTo(99.33412, 2);
        });

        it("should be accurate for very small shape", () => {
            expect(gammaQuantile(0.5, 0.01, 1) / 4.465535e-31).toBeCloseTo(1, 6);
        });
    });

    // References: R 4.6.1 qgamma(p, shape, lower.tail, log.p), %.17g
    describe("log-scale probability boundaries", () => {
        it("returns NaN for log(p) > 0", () => {
            expect(gammaQuantile(0.1, 2, 1, true, true)).toBeNaN();
        });

        it("maps log(p) = 0 and -Inf to the support boundaries", () => {
            expect(gammaQuantile(0, 2, 1, true, true)).toBe(Number.POSITIVE_INFINITY);
            expect(gammaQuantile(0, 2, 1, false, true)).toBe(0);
            expect(gammaQuantile(Number.NEGATIVE_INFINITY, 2, 1, true, true)).toBe(0);
            expect(gammaQuantile(Number.NEGATIVE_INFINITY, 2, 1, false, true)).toBe(Number.POSITIVE_INFINITY);
        });

        it("returns 0 for shape = 0", () => {
            expect(gammaQuantile(0.5, 0, 1)).toBe(0);
        });
    });

    describe("tail paths that skip the Taylor iteration", () => {
        it("p within 1e-14 of 1 goes straight to Newton steps", () => {
            expectRel(gammaQuantile(1 - 1e-15, 2, 1), 38.208468755484816, 1e-14);
            expectRel(gammaQuantile(1e-15, 2, 1, false), 38.207648230599489, 1e-14);
            expectRel(gammaQuantile(-1e-15, 2, 1, true, true), 38.207648230599482, 1e-14);
            expectRel(gammaQuantile(1e-120, 2, 1, false), 281.95550080358834, 1e-14);
        });

        it("a tiny chi-squared start goes straight to Newton steps", () => {
            expectRel(gammaQuantile(1e-20, 0.5, 1), 7.8539816339744616e-41, 1e-14);
            expectRel(gammaQuantile(0.001, 0.2, 1), 6.5254808434572495e-16, 1e-14);
        });

        it("p below 1e-100 goes straight to Newton steps for large shape", () => {
            expectRel(gammaQuantile(1e-300, 1000, 1), 233.92836429052846, 1e-14);
            expectRel(gammaQuantile(-800, 1000, 1, true, true), 203.43232141549021, 1e-14);
        });

        it("upper-tail log probabilities", () => {
            expectRel(gammaQuantile(-50, 3, 1, false, true), 57.443258227084364, 1e-14);
            expectRel(gammaQuantile(Math.log(0.3), 3, 1, false, true), 3.6155676658659908, 1e-14);
        });
    });

    describe("very small shape (seven Newton steps)", () => {
        it("returns 0 when the quantile underflows", () => {
            expect(gammaQuantile(0.5, 1e-11, 1)).toBe(0);
            expect(gammaQuantile(0.5, 1e-11, 1, false)).toBe(0);
        });

        it("matches R in the far upper tail", () => {
            expectRel(gammaQuantile(1 - 1e-12, 1e-11, 1), 1.5001465326878218, 1e-14);
            expectRel(gammaQuantile(1e-12, 1e-11, 1, false), 1.5001316578392214, 1e-14);
            expectRel(gammaQuantile(1e-13, 1e-11, 1, false), 3.21051263066617, 1e-14);
            expectRel(gammaQuantile(-30, 1e-11, 1, false, true), 3.263434761405879, 1e-14);
        });
    });

    describe("Taylor iteration guards", () => {
        it("damps a diverging step (|q - ch| > 0.1 ch)", () => {
            expectRel(gammaQuantile(0.1, 0.17, 1, false), 0.51086250821530721, 1e-14);
            expectRel(gammaQuantile(0.9, 0.17, 1), 0.51086250821530721, 1e-14);
            expectRel(gammaQuantile(1 - 1e-9, 20, 1, false), 3.474228803477085, 1e-14);
        });

        it("restarts from the initial estimate with 27 Newton steps when the series fails", () => {
            expectRel(gammaQuantile(0.5, 1e300, 1), 1.0000000000000001e+300, 1e-14);
        });

        it("returns the rescaled estimate when the start is not finite", () => {
            expect(gammaQuantile(0.5, 1e308, 1)).toBe(Number.POSITIVE_INFINITY);
        });
    });

    describe("full-precision references", () => {
        it("matches R across shapes and tails", () => {
            expectRel(gammaQuantile(0.5, 0.1, 1), 0.0005933911044602256, 1e-14);
            expectRel(gammaQuantile(0.5, 0.01, 1), 4.4655350189103723e-31, 1e-14);
            expectRel(gammaQuantile(0.99, 0.05, 1), 1.0876274000918116, 1e-14);
            expectRel(gammaQuantile(0.5, 100, 1), 99.666864919315429, 1e-14);
            expectRel(gammaQuantile(0.2, 0.3, 1, false), 0.46007388698785107, 1e-14);
            expectRel(gammaQuantile(1e-5, 50, 1, false), 86.049471018069028, 1e-14);
            expectRel(gammaQuantile(0.9999, 1.5, 1), 10.553756733080222, 1e-14);
        });
    });
});
