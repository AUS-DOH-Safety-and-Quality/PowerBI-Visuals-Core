import { gammaQuantile } from "../src/math/index";
import { describe, it, expect } from "vitest";

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

        it("should return NaN for invalid parameters", () => {
            expect(gammaQuantile(0.5, -1, 1)).toBeNaN();
            expect(gammaQuantile(0.5, 2, 0)).toBeNaN();
            expect(gammaQuantile(0.5, 2, -1)).toBeNaN();
        });

        it("should handle NaN inputs", () => {
            expect(gammaQuantile(NaN, 2, 1)).toBeNaN();
            expect(gammaQuantile(0.5, NaN, 1)).toBeNaN();
            expect(gammaQuantile(0.5, 2, NaN)).toBeNaN();
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

    describe("chi-squared relationship", () => {
        it("should match chi-squared quantiles", () => {
            // Chi-squared(df) = Gamma(df/2, scale = 2); values from R's qchisq(0.95, 10) and qchisq(0.99, 20)
            expect(gammaQuantile(0.95, 5, 2)).toBeCloseTo(18.30704, 4);
            expect(gammaQuantile(0.99, 10, 2)).toBeCloseTo(37.56623, 4);
        });
    });
});
