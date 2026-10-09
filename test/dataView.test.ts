import { describe, expect, it } from "vitest";
import type powerbi from "powerbi-visuals-api";
import { validateDataView } from "../src/powerbi/index";

const key: powerbi.DataViewCategoryColumn = { source: { displayName: "Key", roles: { key: true } }, values: ["A"] };
function value(role: string): powerbi.DataViewValueColumn {
  return { source: { displayName: role, roles: { [role]: true } }, values: [1] };
}
function view(categories: powerbi.DataViewCategoryColumn[] | undefined, columns: powerbi.DataViewValueColumn[] = []): powerbi.DataView {
  const values: powerbi.DataViewValueColumns = Object.assign(columns, { grouped: () => [] });
  return { metadata: { columns: [] }, categorical: categories === undefined ? undefined : { categories, values } };
}

describe("data view validation", () => {
  it("reports missing views, keys, rows and required value roles in that order", () => {
    expect(validateDataView(undefined, ["numerators"])).toEqual({ status: "invalid", error: "No data present" });
    expect(validateDataView([], ["numerators"])).toEqual({ status: "invalid", error: "No data present" });
    expect(validateDataView([view(undefined)], ["numerators"])).toEqual({ status: "invalid", error: "No grouping/ID variable passed!" });
    expect(validateDataView([view([{ source: { displayName: "Other", roles: {} }, values: ["A"] }])], []))
      .toEqual({ status: "invalid", error: "No grouping/ID variable passed!" });
    expect(validateDataView([view([{ ...key, values: [] }])], [])).toEqual({ status: "invalid", error: "No data present" });
    expect(validateDataView([view([key])], ["numerators", "denominators"])).toEqual({ status: "invalid", error: "No numerators passed!" });
    expect(validateDataView([view([key], [value("numerators")])], ["numerators", "denominators"]))
      .toEqual({ status: "invalid", error: "No denominators passed!" });
    expect(validateDataView([view([key], [value("numerators"), value("denominators")])], ["numerators", "denominators"]).status).toBe("valid");
    expect(validateDataView([view([key])], []).status).toBe("valid");
  });

  it("narrows the first category, the key and the required roles once", () => {
    const indicator: powerbi.DataViewCategoryColumn = { source: { displayName: "Indicator", roles: { indicator: true } }, values: ["X"] };
    const dataView = view([indicator, key], [value("numerators"), value("tooltips")]);
    const result = validateDataView([dataView], ["numerators"]);
    if (result.status !== "valid") throw new Error(result.error);
    expect(result.view.dataView).toBe(dataView);
    expect(result.view.category).toBe(indicator);
    expect(result.view.rowCount).toBe(1);
    expect(result.view.categories.key).toEqual([key]);
    expect(result.view.categories.indicator).toEqual([indicator]);
    expect(result.view.values.numerators).toHaveLength(1);
    expect(result.view.values.tooltips).toHaveLength(1);
    expect(result.view.values.denominators).toBeUndefined();
  });
});
