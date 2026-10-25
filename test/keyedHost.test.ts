import type powerbi from "powerbi-visuals-api";
import { describe, expect, it } from "vitest";
import { keyedHost } from "../src/testing/index";

describe("keyed test host", () => {
  it("gives rows distinct selection keys", () => {
    const host = keyedHost();
    const column: powerbi.DataViewCategoryColumn = { source: { displayName: "key" }, values: ["A", "B"] };
    const first = host.createSelectionIdBuilder().withCategory(column, 0).createSelectionId();
    const second = host.createSelectionIdBuilder().withCategory(column, 1).createSelectionId();
    expect(first.getKey()).not.toBe(second.getKey());
    expect(first.getKey()).toBe(host.createSelectionIdBuilder().withCategory(column, 0).createSelectionId().getKey());
  });
});
