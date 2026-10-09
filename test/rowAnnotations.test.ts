import { describe, expect, it } from "vitest";
import type powerbi from "powerbi-visuals-api";
import { createDefaultValues, createLabelsCard, defineCard, dotOptions } from "../src/settings/index";
import { indexColumnsByRole, readRowAnnotations } from "../src/powerbi/index";

const cards = { scatter: defineCard({ displayName: "Scatter", description: "", settingsGroups: { all: dotOptions() } }), labels: createLabelsCard() };
const defaults = createDefaultValues(cards);

function categorical(withLabels: boolean): powerbi.DataViewCategorical {
  const values = [
    { source: { displayName: "Numerator", roles: { numerators: true } }, values: [1, 2, 3], highlights: [null, 2, 3] },
    { source: { displayName: "Note", roles: { tooltips: true } }, values: ["n0", null, "n2"] },
    { source: { displayName: "Site", roles: { tooltips: true } }, values: [10, 20, 30] },
    ...(withLabels ? [{ source: { displayName: "Label", roles: { labels: true } }, values: ["", "L1", "L2"] }] : [])
  ];
  return {
    categories: [{
      source: { displayName: "Date", roles: { key: true } }, values: ["A", "B", "C"],
      objects: [{}, { scatter: { size: 9 } }, { scatter: { colour: { solid: { color: "#123456" } } }, labels: { label_size: 14 } }]
    }],
    values: values as unknown as powerbi.DataViewValueColumns
  };
}

function sources(withLabels: boolean) {
  const view = categorical(withLabels);
  return { categorical: view, values: indexColumnsByRole(view.values ?? []), categories: view.categories![0], cards, defaults };
}

describe("row annotations", () => {
  it("reads labels, highlights, tooltip columns and per-row formatting for the kept rows only", () => {
    const result = readRowAnnotations(sources(true), [0, 1, 2], [0, 2]);
    expect(result.labels).toEqual(["", "L2"]);
    expect(result.anyLabels).toBe(true);
    expect(result.highlights).toEqual([undefined, 3]);
    expect(result.anyHighlights).toBe(true);
    expect(result.tooltips).toEqual([
      [{ displayName: "Note", value: "n0" }, { displayName: "Site", value: "10" }],
      [{ displayName: "Note", value: "n2" }, { displayName: "Site", value: "30" }]
    ]);
    expect(result.scatter_formatting).toEqual([defaults.scatter, { ...defaults.scatter, colour: "#123456" }]);
    expect(result.label_formatting).toEqual([defaults.labels, { ...defaults.labels, label_size: 14 }]);
  });

  it("follows the row order given and reads absent columns as blank", () => {
    const result = readRowAnnotations(sources(false), [2, 1], [1, 0]);
    expect(result.labels).toEqual([undefined, undefined]);
    expect(result.anyLabels).toBe(false);
    expect(result.highlights).toEqual([2, 3]);
    expect(result.scatter_formatting[0]).toEqual({ ...defaults.scatter, size: 9 });
    expect(result.scatter_formatting[1]).toEqual({ ...defaults.scatter, colour: "#123456" });
  });

  it("reports no highlights when the kept rows have none", () => {
    const result = readRowAnnotations(sources(true), [0, 1, 2], [0]);
    expect(result.highlights).toEqual([undefined]);
    expect(result.anyHighlights).toBe(false);
    expect(result.anyLabels).toBe(false);
  });
});
