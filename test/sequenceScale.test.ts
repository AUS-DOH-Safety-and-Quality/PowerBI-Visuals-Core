import { describe, expect, it } from "vitest";
import { sequence, scaleLinear } from "../src/math/index";

describe("sequence", () => {
  it("produces exactly count values by repeated addition", () => {
    expect(sequence(1, 4, 1)).toEqual([1, 2, 3, 4]);
    expect(sequence(0, 5, 2)).toEqual([0, 2, 4, 6, 8]);
    expect(sequence(5, 4, -1)).toEqual([5, 4, 3, 2]);
    expect(sequence(3, 4, 1)).toEqual([3, 4, 5, 6]);
    expect(sequence(7, 1, 100)).toEqual([7]);
  });

  it("accumulates fractional steps by addition, not multiplication", () => {
    expect(sequence(0, 4, 0.1)).toEqual([0, 0.1, 0.2, 0.30000000000000004]);
    expect(sequence(1, 3, 0.5)).toEqual([1, 1.5, 2]);
  });

  it("returns an empty array for a zero, negative or non-finite count", () => {
    expect(sequence(1, 0, 1)).toEqual([]);
    expect(sequence(1, -3, 1)).toEqual([]);
    expect(sequence(1, Number.NEGATIVE_INFINITY, 1)).toEqual([]);
    expect(sequence(1, NaN, 1)).toEqual([]);
  });

  it("rejects a fractional count rather than rounding it", () => {
    expect(() => sequence(0, 2.5, 1)).toThrow(RangeError);
  });
});

describe("scaleLinear", () => {
  it("maps a nonzero domain across the output range and inverts it", () => {
    const scale = scaleLinear().domain([0, 100]).range([450, 50]);
    expect(scale(0)).toBe(450);
    expect(scale(25)).toBe(350);
    expect(scale(100)).toBe(50);
    expect(scale.invert(350)).toBe(25);
    expect(scale.domain()).toEqual([0, 100]);
    expect(scale.range()).toEqual([450, 50]);
  });

  it.each([0, 1, 100])("centres an equal domain at %s in the output range", value => {
    const scale = scaleLinear().domain([value, value]).range([450, 50]);
    expect(scale(value)).toBe(250);
    expect(scale(value + 5)).toBe(250);
    expect(scale.copy()(value)).toBe(250);
    expect(scale.ticks(10)).toEqual([value]);
  });

  it("copies independently and does not expose its internal domain array", () => {
    const original = scaleLinear().domain([0, 10]).range([0, 1]);
    const copy = original.copy();
    copy.domain([0, 20]);
    expect(original(10)).toBe(1);
    expect(copy(10)).toBe(0.5);
    const domain = original.domain();
    domain[1] = 99;
    expect(original(10)).toBe(1);
  });

  it("generates d3-style ticks and honours the count", () => {
    const scale = scaleLinear().domain([0, 100]).range([0, 1]);
    expect(scale.ticks()).toEqual([0, 10, 20, 30, 40, 50, 60, 70, 80, 90, 100]);
    expect(scale.ticks(5)).toEqual([0, 20, 40, 60, 80, 100]);
    expect(scale.ticks(0)).toEqual([]);
    // d3-array 3.2.4 ticks: fractional steps divide, so decimals are exact
    expect(scaleLinear().domain([0, 0.5]).ticks(5)).toEqual([0, 0.1, 0.2, 0.3, 0.4, 0.5]);
    expect(scaleLinear().domain([0, 1.1]).ticks()).toEqual([0, 0.1, 0.2, 0.3, 0.4, 0.5, 0.6, 0.7, 0.8, 0.9, 1, 1.1]);
    // Step choice uses d3's exact thresholds (sqrt 2, 10, 50): a 1.411 step error stays at factor 1
    expect(scaleLinear().domain([0.001, 0.0137]).ticks(9))
      .toEqual([0.001, 0.002, 0.003, 0.004, 0.005, 0.006, 0.007, 0.008, 0.009, 0.01, 0.011, 0.012, 0.013]);
  });
});
