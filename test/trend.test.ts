import { trend } from "../src/spc/index";
import { describe, it, expect } from "vitest";

describe("trend", () => {
    it("should return 'none' when no trend is detected", () => {
        const val = [5, 6, 5, 6, 5, 6, 5];
        const n = 5;

        const result = trend(val, n);

        expect(result).toEqual(["none", "none", "none", "none", "none", "none", "none"]);
    });

    it("should detect upward trend when n consecutive increases (n=5)", () => {
        const val = [1, 2, 3, 4, 5, 6, 5];
        const n = 5;

        const result = trend(val, n);

        // 5 consecutive points trending up detected, backfills to include first point
        expect(result).toEqual(["upper", "upper", "upper", "upper", "upper", "upper", "none"]);
    });

    it("should detect trend exactly at n points (n=3)", () => {
        const val = [1, 2, 3, 4, 2];
        const n = 3;

        const result = trend(val, n);

        expect(result).toEqual(["upper", "upper", "upper", "upper", "none"]);
    });

    it("should reset when trend is interrupted", () => {
        const val = [1, 2, 3, 2, 3, 4, 5, 6];
        const n = 4;

        const result = trend(val, n);

        // First trend not sufficient (only 2 consecutive increases), new trend from index 4-7
        expect(result).toEqual(["none", "none", "none", "upper", "upper", "upper", "upper", "upper"]);
    });

    it("should handle equal consecutive values (no trend)", () => {
        const val = [5, 5, 5, 5, 5];
        const n = 3;

        const result = trend(val, n);

        expect(result).toEqual(["none", "none", "none", "none", "none"]);
    });

    it("should handle empty arrays", () => {
        const val: number[] = [];
        const n = 5;

        const result = trend(val, n);

        expect(result).toEqual([]);
    });

    it("should handle single point", () => {
        const val = [5];
        const n = 3;

        const result = trend(val, n);

        expect(result).toEqual(["none"]);
    });

    it("should detect trend with n=2 (any consecutive increase/decrease)", () => {
        const val = [1, 2, 1, 3, 2];
        const n = 2;

        const result = trend(val, n);

        // With n=2, every change from previous point triggers trend; each turning point stays with the earlier one
        expect(result).toEqual(["upper", "upper", "lower", "upper", "lower"]);
    });

    // Perla et al. (2011): like values neither make nor break a trend
    it("should count repeated values once, flagging them within the trend", () => {
        expect(trend([1, 2, 3, 3, 4, 5], 5)).toEqual(["upper", "upper", "upper", "upper", "upper", "upper"]);
        expect(trend([2, 2, 3, 4], 3)).toEqual(["upper", "upper", "upper", "upper"]);
        expect(trend([1, 2, 2, 3, 4, 5], 6)).toEqual(["none", "none", "none", "none", "none", "none"]);
    });

    it("should keep a turning point with the earlier trend", () => {
        expect(trend([1, 2, 3, 2, 1], 3)).toEqual(["upper", "upper", "upper", "lower", "lower"]);
        expect(trend([1, 2, 3, 3, 2, 1], 3)).toEqual(["upper", "upper", "upper", "lower", "lower", "lower"]);
    });

    it("should handle mixed increases and decreases with no sustained trend", () => {
        const val = [1, 3, 2, 4, 3, 5];
        const n = 4;

        const result = trend(val, n);

        expect(result).toEqual(["none", "none", "none", "none", "none", "none"]);
    });
});
