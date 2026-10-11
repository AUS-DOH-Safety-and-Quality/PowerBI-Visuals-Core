import { describe, expect, it } from "vitest";
import { median, max, rep, between, clamp } from "../src/math/index";

describe("median", () => {
  it("returns NaN for empty input", () => {
    expect(median([])).toBeNaN();
  });

  it("median sorts an owned copy for odd and even lengths", () => {
    const values = [5, 1, 4, 2, 3];
    expect(median(values)).toBe(3);
    expect(values).toEqual([5, 1, 4, 2, 3]);
    expect(median([4, 1, 3, 2])).toBe(2.5);
    expect(median([7])).toBe(7);
  });
});

describe("max", () => {
  const cases: number[][] = [
    [], [3], [3, 1, 2], [-1, -5, -3], [Infinity, 1], [-Infinity, 1], [Infinity, -Infinity],
    [1e308, -1e308, 5], [2, 2, 2]
  ];

  it("matches Math.max, including empty input and infinities", () => {
    for (let i = 0; i < cases.length; i++) {
      const values = cases[i];
      expect(max(values), `max ${JSON.stringify(values)}`).toBe(Math.max(...values));
    }
  });

  it("handles inputs larger than the argument-spread limit", () => {
    const values = new Array<number>(500000);
    for (let i = 0; i < values.length; i++) {
      values[i] = (i * 7919) % 100003;
    }
    expect(max(values)).toBe(100002);
  });
});

describe("rep", () => {
  it("repeats primitives and returns an empty array for zero", () => {
    expect(rep(5, 3)).toEqual([5, 5, 5]);
    expect(rep("a", 2)).toEqual(["a", "a"]);
    expect(rep(10, 0)).toEqual([]);
    expect(rep(undefined, 2)).toEqual([undefined, undefined]);
  });

  it("repeats the same object reference rather than cloning", () => {
    const obj = { id: 1 };
    const result = rep(obj, 2);
    expect(result[0]).toBe(obj);
    expect(result[1]).toBe(obj);
    obj.id = 2;
    expect(result[0].id).toBe(2);
  });
});

describe("clamp", () => {
  it("applies supplied bounds, including zero, and leaves undefined sides open", () => {
    expect(clamp(5, 0, 1)).toBe(1);
    expect(clamp(-5, 0, 1)).toBe(0);
    expect(clamp(0.5, 0, 1)).toBe(0.5);
    expect(clamp(-1, 0, undefined)).toBe(0);
    expect(clamp(1, undefined, 0)).toBe(0);
    expect(clamp(-1, undefined, 0)).toBe(-1);
    expect(clamp(7, undefined, undefined)).toBe(7);
  });

  it("ignores NaN or non-finite bounds by comparison", () => {
    expect(clamp(5, NaN, NaN)).toBe(5);
    expect(clamp(Infinity, 0, 1)).toBe(1);
    expect(clamp(-Infinity, 0, undefined)).toBe(0);
    expect(clamp(5, -Infinity, Infinity)).toBe(5);
    expect(Object.is(clamp(-0, 0, 1), -0)).toBe(true);
  });
});

describe("between", () => {
  it("is inclusive", () => {
    expect(between(5, 0, 10)).toBe(true);
    expect(between(0, 0, 10)).toBe(true);
    expect(between(10, 0, 10)).toBe(true);
    expect(between(-1, 0, 10)).toBe(false);
    expect(between(11, 0, 10)).toBe(false);
  });
});
