import { normalDensity } from "../src/math/index";
import { describe, it, expect } from "vitest";

describe("normalDensity", () => {
    // Reference values computed using R's dnorm function
    const ONE_DIV_SQRT_TWO_PI = 1 / Math.sqrt(2 * Math.PI);

    describe("standard normal N(0,1)", () => {
        it("should return maximum density at the mean", () => {
            expect(normalDensity(0, 0, 1)).toBeCloseTo(ONE_DIV_SQRT_TWO_PI, 7);
            expect(normalDensity(0, 0, 1)).toBeCloseTo(0.3989423, 6);
        });

        it("should return correct values for common z-scores", () => {
            expect(normalDensity(1, 0, 1)).toBeCloseTo(0.2419707, 6);
            expect(normalDensity(-1, 0, 1)).toBeCloseTo(0.2419707, 6);
            expect(normalDensity(2, 0, 1)).toBeCloseTo(0.05399097, 7);
            expect(normalDensity(-2, 0, 1)).toBeCloseTo(0.05399097, 7);
            expect(normalDensity(3, 0, 1)).toBeCloseTo(0.004431848, 8);
            expect(normalDensity(-3, 0, 1)).toBeCloseTo(0.004431848, 8);
        });

        it("should be symmetric around the mean", () => {
            expect(normalDensity(-1, 0, 1)).toBeCloseTo(normalDensity(1, 0, 1), 10);
            expect(normalDensity(-2.5, 0, 1)).toBeCloseTo(normalDensity(2.5, 0, 1), 10);
            expect(normalDensity(-5, 0, 1)).toBeCloseTo(normalDensity(5, 0, 1), 10);
        });
    });

    describe("general normal N(mu, sigma)", () => {
        it("should return maximum density at the mean", () => {
            expect(normalDensity(5, 5, 2)).toBeCloseTo(0.1994711, 6);
            expect(normalDensity(10, 10, 0.5)).toBeCloseTo(0.7978846, 6);
        });

        it("should correctly scale with sigma", () => {
            expect(normalDensity(0, 0, 1)).toBeCloseTo(1 / (1 * Math.sqrt(2 * Math.PI)), 10);
            expect(normalDensity(0, 0, 2)).toBeCloseTo(1 / (2 * Math.sqrt(2 * Math.PI)), 10);
            expect(normalDensity(0, 0, 0.5)).toBeCloseTo(1 / (0.5 * Math.sqrt(2 * Math.PI)), 10);
        });

        it("should correctly standardize", () => {
            expect(normalDensity(12, 10, 2)).toBeCloseTo(normalDensity(1, 0, 1) / 2, 10);

            const x = 7;
            const mu = 5;
            const sigma = 3;
            const expected = normalDensity((x - mu) / sigma, 0, 1) / sigma;
            expect(normalDensity(x, mu, sigma)).toBeCloseTo(expected, 10);
        });
    });

    describe("extreme values", () => {
        it("should handle large z-scores", () => {
            expect(normalDensity(5, 0, 1)).toBeCloseTo(1.486720e-6, 11);
            expect(normalDensity(6, 0, 1)).toBeCloseTo(6.075883e-9, 14);
            const d10 = normalDensity(10, 0, 1);
            expect(d10).toBeCloseTo(7.694599e-23, 27);
        });

        it("should return 0 for very large z-scores", () => {
            expect(normalDensity(40, 0, 1)).toBe(0);
            expect(normalDensity(-40, 0, 1)).toBe(0);
        });

        it("should handle infinity", () => {
            expect(normalDensity(Number.POSITIVE_INFINITY, 0, 1)).toBe(0);
            expect(normalDensity(Number.NEGATIVE_INFINITY, 0, 1)).toBe(0);
        });
    });

    describe("log scale", () => {
        it("should return log density when log_p is true", () => {
            expect(normalDensity(0, 0, 1, true)).toBeCloseTo(-0.9189385, 6);
            expect(normalDensity(1, 0, 1, true)).toBeCloseTo(-1.418939, 5);
            expect(normalDensity(2, 0, 1, true)).toBeCloseTo(-2.918939, 5);
        });

        it("should handle extreme values in log scale", () => {
            expect(normalDensity(10, 0, 1, true)).toBeCloseTo(-50.91894, 4);

            const logD = normalDensity(37, 0, 1, true);
            expect(Number.isFinite(logD)).toBe(true);
            expect(logD).toBeCloseTo(-685.4189, 3);
        });

        it("should satisfy log(f(x)) = -log(sigma) - log(sqrt(2*pi)) - z^2/2", () => {
            const x = 3;
            const mu = 1;
            const sigma = 2;
            const z = (x - mu) / sigma;
            const expected = -Math.log(sigma) - 0.5 * Math.log(2 * Math.PI) - 0.5 * z * z;
            expect(normalDensity(x, mu, sigma, true)).toBeCloseTo(expected, 10);
        });
    });

    describe("edge cases", () => {
        it("should return NaN for NaN inputs", () => {
            expect(normalDensity(NaN, 0, 1)).toBeNaN();
            expect(normalDensity(0, NaN, 1)).toBeNaN();
            expect(normalDensity(0, 0, NaN)).toBeNaN();
        });

        it("should return NaN for negative sigma", () => {
            expect(normalDensity(0, 0, -1)).toBeNaN();
        });

        it("should handle sigma = 0 (degenerate distribution)", () => {
            expect(normalDensity(0, 0, 0)).toBe(Number.POSITIVE_INFINITY);
            expect(normalDensity(1, 0, 0)).toBe(0);
            expect(normalDensity(-1, 0, 0)).toBe(0);
        });

        it("should return 0 for infinite sigma", () => {
            expect(normalDensity(0, 0, Number.POSITIVE_INFINITY)).toBe(0);
            expect(normalDensity(100, 0, Number.POSITIVE_INFINITY)).toBe(0);
        });
    });

    describe("numerical precision", () => {
        it("should maintain precision near the mean", () => {
            const d1 = normalDensity(1e-10, 0, 1);
            const d0 = normalDensity(0, 0, 1);
            expect(d1).toBeCloseTo(d0, 10);
        });

        it("should maintain precision for moderate z-scores", () => {
            expect(normalDensity(4, 0, 1)).toBeCloseTo(0.0001338302, 9);
            expect(normalDensity(-4, 0, 1)).toBeCloseTo(0.0001338302, 9);
        });

        it("should integrate to approximately 1", () => {
            let sum = 0;
            const dx = 0.01;
            for (let x = -10; x <= 10; x += dx) {
                sum += normalDensity(x, 0, 1) * dx;
            }
            expect(sum).toBeCloseTo(1, 2);
        });
    });
});
