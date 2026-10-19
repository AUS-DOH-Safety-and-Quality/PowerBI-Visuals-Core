import { describe, expect, it } from "vitest";
import { aggregateColumn } from "../src/frontends/aggregations";

describe("column aggregation", () => {
  const column = [null, 4, Number.NaN, 1, null, 3, null];

  it("skips missing values in every method", () => {
    expect(aggregateColumn(column, "first")).toBe(4);
    expect(aggregateColumn(column, "last")).toBe(3);
    expect(aggregateColumn(column, "sum")).toBe(8);
    expect(aggregateColumn(column, "mean")).toBeCloseTo(8 / 3, 12);
    expect(aggregateColumn(column, "min")).toBe(1);
    expect(aggregateColumn(column, "max")).toBe(4);
    expect(aggregateColumn(column, "median")).toBe(3);
    expect(aggregateColumn(column, "count")).toBe(3);
    expect(aggregateColumn([null, "b", "a", null], "first")).toBe("b");
    expect(aggregateColumn([null, "b", "a", null], "last")).toBe("a");
  });

  it("counts an all-missing or empty column as 0 and leaves it missing otherwise", () => {
    const columns = [[null, Number.NaN, null], []];
    const methods = ["first", "last", "sum", "mean", "min", "max", "median"] as const;
    for (let c = 0; c < columns.length; c++) {
      expect(aggregateColumn(columns[c], "count")).toBe(0);
      for (let m = 0; m < methods.length; m++) {
        expect(aggregateColumn(columns[c], methods[m]), methods[m]).toBeNull();
      }
    }
  });

  it("keeps zero", () => {
    expect(aggregateColumn([null, 0], "first")).toBe(0);
    expect(aggregateColumn([0, null], "last")).toBe(0);
    expect(aggregateColumn([0, null], "count")).toBe(1);
  });
});
