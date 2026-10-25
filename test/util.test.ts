import { describe, expect, it } from "vitest";
import { at } from "../src/util/index";

describe("at", () => {
  it("reads elements in bounds, including falsy ones", () => {
    const values: readonly (number | null | string)[] = [0, null, "", 3];
    expect(at(values, 0)).toBe(0);
    expect(at(values, 1)).toBeNull();
    expect(at(values, 2)).toBe("");
    expect(at(values, 3)).toBe(3);
  });

  it("reads array-likes such as DOM lists", () => {
    const list: ArrayLike<string> = { length: 2, 0: "a", 1: "b" };
    expect(at(list, 1)).toBe("b");
    expect(() => at(list, 2)).toThrow(RangeError);
  });

  it("throws a RangeError naming the index and length when out of bounds", () => {
    expect(() => at([1, 2], 2)).toThrow(new RangeError("Index 2 out of bounds for length 2."));
    expect(() => at([1, 2], -1)).toThrow(RangeError);
    expect(() => at([], 0)).toThrow(RangeError);
  });
});
