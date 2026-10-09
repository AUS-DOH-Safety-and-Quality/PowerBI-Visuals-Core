import { describe, expect, it } from "vitest";
import { pickRows, formatNumber } from "../src/data/index";
import { indexColumnsByRole, formatPrimitiveValue } from "../src/powerbi/index";

describe("row and display contracts", () => {
  it("preserves requested order, duplicates, missing cells and out-of-range positions", () => {
    expect(pickRows([10, 20], [1, 5, 0, 1])).toEqual([20, undefined, 10, 20]);
    expect(pickRows([undefined, false, 0, ""], [0, 3, 1, 2, -1, 0.5])).toEqual([undefined, "", false, 0, undefined, undefined]);
    expect(pickRows([], [0])).toEqual([undefined]);
    expect(pickRows([10], [])).toEqual([]);
  });

  it("allocates the selected array without copying or mutating its cells", () => {
    const row = { value: 1 };
    const input = [row];
    const selected = pickRows(input, [0, 0]);
    expect(selected).not.toBe(input);
    expect(selected[0]).toBe(row);
    expect(selected[1]).toBe(row);
    expect(input).toEqual([row]);
  });

  it("converts primitive values without treating zero, false or blank as missing", () => {
    expect(formatPrimitiveValue(null)).toBeUndefined();
    expect(formatPrimitiveValue(undefined)).toBeUndefined();
    expect(formatPrimitiveValue(0)).toBe("0");
    expect(formatPrimitiveValue(false)).toBe("false");
    expect(formatPrimitiveValue(12.5)).toBe("12.5");
    expect(formatPrimitiveValue("text")).toBe("text");
    expect(formatPrimitiveValue("")).toBe("");
    const date = new Date(2020, 0, 1);
    expect(formatPrimitiveValue(date)).toBe(String(date));
  });

  it("keeps native decimal rounding and applies only the supplied suffix", () => {
    expect(formatNumber(undefined, 2, "%")).toBeUndefined();
    expect(formatNumber(0, 2, "%")).toBe("0.00%");
    expect(formatNumber(12.6, 0, "")).toBe("13");
    expect(formatNumber(12.625, 2, "%")).toBe("12.63%");
    expect(formatNumber(-0.001, 2, "")).toBe("-0.00");
    expect(formatNumber(-0, 2, "")).toBe("0.00");
    expect(formatNumber(NaN, 2, "")).toBe("NaN");
    expect(formatNumber(Infinity, 2, "")).toBe("Infinity");
  });

  it("indexes multiple roles and columns in source order without copying columns", () => {
    const first = { source: { roles: { numerator: true, tooltip: true, ignored: false } }, values: [1] };
    const second = { source: { roles: { tooltip: true } }, values: [2] };
    const unassigned = { source: {}, values: [] };
    const roles = indexColumnsByRole([first, unassigned, second]);
    expect(roles.numerator).toEqual([first]);
    expect(roles.tooltip).toEqual([first, second]);
    expect(roles.numerator?.[0]).toBe(first);
    expect(roles.ignored).toBeUndefined();
    expect(roles.absent).toBeUndefined();
    expect(indexColumnsByRole([])).toEqual({});
  });
});
