import { normalCDF } from "../src/math/index";
import { describe, it, expect } from "vitest";

describe("normalCDF", () => {
    // Reference values computed using R's pnorm function

    describe("standard normal N(0,1)", () => {
        it("should return 0.5 at the mean", () => {
            expect(normalCDF(0, 0, 1)).toBeCloseTo(0.5, 10);
        });

        it("should return correct values for common z-scores", () => {
            expect(normalCDF(-3, 0, 1)).toBeCloseTo(0.001349898, 8);
            expect(normalCDF(-2, 0, 1)).toBeCloseTo(0.02275013, 7);
            expect(normalCDF(-1, 0, 1)).toBeCloseTo(0.1586553, 6);
            expect(normalCDF(1, 0, 1)).toBeCloseTo(0.8413447, 6);
            expect(normalCDF(2, 0, 1)).toBeCloseTo(0.9772499, 6);
            expect(normalCDF(3, 0, 1)).toBeCloseTo(0.9986501, 6);
        });

        it("should return correct values for fractional z-scores", () => {
            expect(normalCDF(0.5, 0, 1)).toBeCloseTo(0.6914625, 6);
            expect(normalCDF(1.5, 0, 1)).toBeCloseTo(0.9331928, 6);
            expect(normalCDF(1.96, 0, 1)).toBeCloseTo(0.9750021, 6);
            expect(normalCDF(2.576, 0, 1)).toBeCloseTo(0.9950025, 5);
        });
    });

    describe("general normal N(mu, sigma)", () => {
        it("should correctly standardize the distribution", () => {
            // Each case standardises to z = 1: pnorm(1) = 0.8413447
            expect(normalCDF(12, 10, 2)).toBeCloseTo(0.8413447, 6);
            expect(normalCDF(115, 100, 15)).toBeCloseTo(0.8413447, 6);
            expect(normalCDF(-4.5, -5, 0.5)).toBeCloseTo(0.8413447, 6);
        });
    });

    describe("extreme values", () => {
        it("should handle large positive z-scores", () => {
            expect(normalCDF(5, 0, 1)).toBeCloseTo(0.9999997, 6);
            expect(normalCDF(6, 0, 1)).toBeCloseTo(0.9999999990, 8);
            const p8 = normalCDF(8, 0, 1);
            expect(p8).toBeLessThan(1);
            expect(p8).toBeGreaterThan(0.999999999);
        });

        it("should handle large negative z-scores", () => {
            expect(normalCDF(-5, 0, 1)).toBeCloseTo(2.866516e-7, 12);
            expect(normalCDF(-6, 0, 1)).toBeCloseTo(9.865876e-10, 15);
        });

        it("should return 0 for very large negative values", () => {
            expect(normalCDF(-40, 0, 1)).toBe(0);
            expect(normalCDF(-100, 0, 1)).toBe(0);
        });

        it("should return 1 for very large positive values", () => {
            expect(normalCDF(40, 0, 1)).toBe(1);
            expect(normalCDF(100, 0, 1)).toBe(1);
        });

        it("should handle infinity", () => {
            expect(normalCDF(Number.POSITIVE_INFINITY, 0, 1)).toBe(1);
            expect(normalCDF(Number.NEGATIVE_INFINITY, 0, 1)).toBe(0);
        });
    });

    describe("upper tail", () => {
        it("should handle extreme upper tail values accurately", () => {
            expect(normalCDF(5, 0, 1, false)).toBeCloseTo(2.866516e-7, 12);
        });
    });

    describe("log scale", () => {
        it("should return log probabilities when log_p is true", () => {
            expect(normalCDF(0, 0, 1, true, true)).toBeCloseTo(-0.6931472, 6);
            expect(normalCDF(1, 0, 1, true, true)).toBeCloseTo(-0.1727538, 5);
        });

        it("should handle extreme values in log scale", () => {
            expect(normalCDF(-10, 0, 1, true, true)).toBeCloseTo(-53.23129, 5);
            expect(normalCDF(-37, 0, 1, true, true)).toBeCloseTo(-689.0306, 4);
        });
    });

    describe("edge cases", () => {
        it("should handle sigma = 0 (degenerate distribution)", () => {
            expect(normalCDF(-1, 0, 0)).toBe(0);
            expect(normalCDF(0, 0, 0)).toBe(1);
            expect(normalCDF(1, 0, 0)).toBe(1);
        });

        it("should return 0.5 everywhere for infinite sigma", () => {
            // pnorm(x, 0, Inf) = 0.5 for every finite x
            expect(normalCDF(-1, 0, Number.POSITIVE_INFINITY)).toBe(0.5);
            expect(normalCDF(0, 0, Number.POSITIVE_INFINITY)).toBe(0.5);
            expect(normalCDF(1e6, 0, Number.POSITIVE_INFINITY)).toBe(0.5);
        });
    });

    describe("numerical precision", () => {
        it("should maintain precision in the tails", () => {
            expect(normalCDF(4, 0, 1)).toBeCloseTo(0.9999683, 6);
            expect(normalCDF(-4, 0, 1)).toBeCloseTo(3.167124e-5, 9);
        });
    });
});
