import { gammaDensity } from "../src/math/index";
import { describe, it, expect } from "vitest";

describe("gammaDensity", () => {
    // Reference values from R's dgamma(x, shape, scale = scale)

    describe("basic functionality", () => {
        it("should return correct values for Gamma(1, 1) = Exp(1)", () => {
            expect(gammaDensity(0, 1, 1, false)).toBeCloseTo(1, 10);
            expect(gammaDensity(1, 1, 1, false)).toBeCloseTo(Math.exp(-1), 10);
            expect(gammaDensity(2, 1, 1, false)).toBeCloseTo(Math.exp(-2), 10);
            expect(gammaDensity(5, 1, 1, false)).toBeCloseTo(Math.exp(-5), 10);
        });

        it("should return correct values for Gamma(2, 1)", () => {
            expect(gammaDensity(0, 2, 1, false)).toBe(0);
            expect(gammaDensity(1, 2, 1, false)).toBeCloseTo(0.3678794, 6);
            expect(gammaDensity(2, 2, 1, false)).toBeCloseTo(0.2706706, 6);
            expect(gammaDensity(5, 2, 1, false)).toBeCloseTo(0.03368973, 7);
        });

        it("should return correct values for various shape and scale", () => {
            expect(gammaDensity(2, 3, 2, false)).toBeCloseTo(0.09196986, 6);
            expect(gammaDensity(5, 2, 3, false)).toBeCloseTo(0.10493089, 6);
            expect(gammaDensity(10, 5, 2, false)).toBeCloseTo(0.08773368, 6);
        });
    });

    describe("behavior at x = 0", () => {
        it("should return Infinity for shape < 1 at x = 0", () => {
            expect(gammaDensity(0, 0.5, 1, false)).toBe(Number.POSITIVE_INFINITY);
            expect(gammaDensity(0, 0.1, 1, false)).toBe(Number.POSITIVE_INFINITY);
            expect(gammaDensity(0, 0.9, 1, false)).toBe(Number.POSITIVE_INFINITY);
        });

        it("should return 1/scale for shape = 1 at x = 0", () => {
            expect(gammaDensity(0, 1, 1, false)).toBeCloseTo(1, 10);
            expect(gammaDensity(0, 1, 2, false)).toBeCloseTo(0.5, 10);
            expect(gammaDensity(0, 1, 0.5, false)).toBeCloseTo(2, 10);
        });

        it("should return 0 for shape > 1 at x = 0", () => {
            expect(gammaDensity(0, 1.1, 1, false)).toBe(0);
            expect(gammaDensity(0, 2, 1, false)).toBe(0);
            expect(gammaDensity(0, 10, 1, false)).toBe(0);
        });
    });

    describe("shape parameter < 1", () => {
        it("should return correct values for small shape", () => {
            expect(gammaDensity(0.5, 0.5, 1, false)).toBeCloseTo(0.48394145, 6);
            expect(gammaDensity(1, 0.5, 1, false)).toBeCloseTo(0.20755375, 6);
            expect(gammaDensity(2, 0.5, 1, false)).toBeCloseTo(0.05399097, 6);
        });

        it("should return correct values for very small shape", () => {
            expect(gammaDensity(0.1, 0.1, 1, false)).toBeCloseTo(0.7554920, 6);
        });
    });

    describe("scale parameter", () => {
        it("should scale density inversely with scale", () => {
            const x = 4;
            const shape = 2;
            const scale = 2;
            const d1 = gammaDensity(x, shape, scale, false);
            const d2 = gammaDensity(x / scale, shape, 1, false) / scale;
            expect(d1).toBeCloseTo(d2, 10);
        });

        it("should return correct values for various scales", () => {
            expect(gammaDensity(2, 2, 0.5, false)).toBeCloseTo(0.14652511, 6);
            expect(gammaDensity(2, 2, 2, false)).toBeCloseTo(0.1839397, 6);
        });
    });

    describe("log scale", () => {
        it("should return log density when log_p is true", () => {
            expect(gammaDensity(1, 2, 1, true)).toBeCloseTo(-1, 6);
            expect(gammaDensity(2, 2, 1, true)).toBeCloseTo(-1.306853, 5);
        });

        it("should handle extreme values in log scale", () => {
            expect(gammaDensity(100, 2, 1, true)).toBeCloseTo(-95.39483, 5);
        });

        it("should be consistent with non-log version", () => {
            const x = 3;
            const shape = 2.5;
            const scale = 1.5;
            const d = gammaDensity(x, shape, scale, false);
            const logD = gammaDensity(x, shape, scale, true);
            expect(logD).toBeCloseTo(Math.log(d), 10);
        });
    });

    describe("edge cases", () => {
        it("should return 0 for negative x", () => {
            expect(gammaDensity(-1, 2, 1, false)).toBe(0);
            expect(gammaDensity(-0.001, 2, 1, false)).toBe(0);
        });

        it("should return NaN for NaN inputs", () => {
            expect(gammaDensity(NaN, 2, 1, false)).toBeNaN();
            expect(gammaDensity(1, NaN, 1, false)).toBeNaN();
            expect(gammaDensity(1, 2, NaN, false)).toBeNaN();
        });

        it("should return NaN for invalid parameters", () => {
            expect(gammaDensity(1, -1, 1, false)).toBeNaN();
            expect(gammaDensity(1, 2, 0, false)).toBeNaN();
            expect(gammaDensity(1, 2, -1, false)).toBeNaN();
        });

        it("should handle shape = 0 (degenerate distribution)", () => {
            expect(gammaDensity(0, 0, 1, false)).toBe(Number.POSITIVE_INFINITY);
            expect(gammaDensity(1, 0, 1, false)).toBe(0);
        });
    });

    describe("large parameter values", () => {
        it("should handle large shape parameter", () => {
            expect(gammaDensity(100, 100, 1, false)).toBeCloseTo(0.03986100, 7);
            expect(gammaDensity(50, 50, 1, false)).toBeCloseTo(0.05632501, 7);
        });

        it("should handle large x values", () => {
            expect(gammaDensity(50, 2, 1, false) / 9.643749e-21).toBeCloseTo(1, 6);
        });
    });

    describe("chi-squared relationship", () => {
        it("should match chi-squared density", () => {
            // Chi-squared(df) = Gamma(df/2, scale = 2); values from R's dchisq(5, 10) and dchisq(10, 4)
            expect(gammaDensity(5, 5, 2, false)).toBeCloseTo(0.06680094, 5);
            expect(gammaDensity(10, 2, 2, false)).toBeCloseTo(0.01684487, 6);
        });
    });

    describe("numerical precision", () => {
        it("should maintain precision for moderate values", () => {
            expect(gammaDensity(5, 3, 1, false)).toBeCloseTo(0.08422434, 7);
        });

        it("should integrate to approximately 1", () => {
            let sum = 0;
            const dx = 0.01;
            for (let x = 0; x <= 20; x += dx) {
                sum += gammaDensity(x, 2, 1, false) * dx;
            }
            expect(sum).toBeCloseTo(1, 2);
        });
    });
});
