import { describe, expect, it } from "vitest";
import { validateDataView } from "../src/powerbi/index";

const key = { source: { roles: { key: true } }, values: ["A"] };
function value(role: string) {
  return { source: { roles: { [role]: true } } };
}

describe("data view validation", () => {
  it("reports missing views, keys, rows and required value roles in that order", () => {
    expect(validateDataView(undefined, ["numerators"])).toBe("No data present");
    expect(validateDataView([], ["numerators"])).toBe("No data present");
    expect(validateDataView([{}], ["numerators"])).toBe("No grouping/ID variable passed!");
    expect(validateDataView([{ categorical: { categories: [{ source: { roles: {} }, values: ["A"] }] } }], [])).toBe("No grouping/ID variable passed!");
    expect(validateDataView([{ categorical: { categories: [{ ...key, values: [] }] } }], [])).toBe("No data present");
    expect(validateDataView([{ categorical: { categories: [key] } }], ["numerators", "denominators"])).toBe("No numerators passed!");
    expect(validateDataView([{ categorical: { categories: [key], values: [value("numerators")] } }], ["numerators", "denominators"])).toBe("No denominators passed!");
    expect(validateDataView([{ categorical: { categories: [key], values: [value("numerators"), value("denominators")] } }], ["numerators", "denominators"])).toBe("valid");
    expect(validateDataView([{ categorical: { categories: [key] } }], [])).toBe("valid");
  });
});
