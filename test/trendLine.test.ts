import { calculateTrendLine } from "../src/math/index";
import { describe, it, expect } from "vitest";

describe("calculateTrendLine", () => {
    it("should return an empty array if input is empty", () => {
        expect(calculateTrendLine([])).toEqual([]);
    });

    it("should calculate trend line for perfectly linear data", () => {
        const values = [1, 2, 3, 4, 5];
        const result = calculateTrendLine(values);
        expect(result).toEqual(values);
    });

    it("should calculate trend line for constant data", () => {
        const values = [5, 5, 5];
        const result = calculateTrendLine(values);
        const expected = [5, 5, 5];
        expect(result).toEqual(expected);
    });

    it("should calculate trend line for valid data points", () => {
        const values = [1, 3, 2];
        // Least squares on x = 1, 2, 3: slope = (3*13 - 6*6) / (3*14 - 6*6) = 0.5,
        // intercept = (6 - 0.5*6) / 3 = 1, so y = 0.5x + 1
        const result = calculateTrendLine(values);
        expect(result[0]).toBeCloseTo(1.5);
        expect(result[1]).toBeCloseTo(2.0);
        expect(result[2]).toBeCloseTo(2.5);
    });

    // R: fitted(lm(y ~ x)) for a single point is the point itself
    it("should return the point itself for a single element, which has no slope", () => {
         expect(calculateTrendLine([10])).toEqual([10]);
    });
});
