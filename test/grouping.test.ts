import { describe, expect, it } from "vitest";
import { isNullOrUndefined, isValidNumber, groupBy } from "../src/data/index";

describe("missing-value and finite-number predicates", () => {
  it("isNullOrUndefined accepts only null and undefined", () => {
    expect(isNullOrUndefined(null)).toBe(true);
    expect(isNullOrUndefined(undefined)).toBe(true);
    expect(isNullOrUndefined(0)).toBe(false);
    expect(isNullOrUndefined("")).toBe(false);
    expect(isNullOrUndefined(false)).toBe(false);
    expect(isNullOrUndefined(NaN)).toBe(false);
  });

  it("isValidNumber accepts only finite numbers", () => {
    expect(isValidNumber(0)).toBe(true);
    expect(isValidNumber(-0)).toBe(true);
    expect(isValidNumber(-1.5)).toBe(true);
    expect(isValidNumber(Number.MAX_VALUE)).toBe(true);
    expect(isValidNumber(NaN)).toBe(false);
    expect(isValidNumber(Infinity)).toBe(false);
    expect(isValidNumber(-Infinity)).toBe(false);
    expect(isValidNumber(null)).toBe(false);
    expect(isValidNumber(undefined)).toBe(false);
    expect(isValidNumber("1")).toBe(false);
    expect(isValidNumber(true)).toBe(false);
  });
});

describe("groupBy", () => {
  it("groups by first-seen key order and preserves row order", () => {
    const data = [
      { category: "A", value: 1 },
      { category: "B", value: 2 },
      { category: "A", value: 3 },
      { category: "C", value: 4 }
    ];
    const result = groupBy(data, "category");
    expect(result).toEqual([
      ["A", [{ category: "A", value: 1 }, { category: "A", value: 3 }]],
      ["B", [{ category: "B", value: 2 }]],
      ["C", [{ category: "C", value: 4 }]]
    ]);
    expect(result[0][1][0]).toBe(data[0]);
    expect(data).toHaveLength(4);
  });

  it("returns an empty array for empty input", () => {
    expect(groupBy([] as { category: string }[], "category")).toEqual([]);
  });
});
