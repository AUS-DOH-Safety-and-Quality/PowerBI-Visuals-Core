import { describe, expect, it } from "vitest";
import { readSettingsRows, buildFormattingModel } from "../src/powerbi/index";
import { defineCard, createDefaultValues, numberOption, createAxisCard, createLineGroup, scalingOptions } from "../src/settings/index";

const card = defineCard({
  displayName: "Subset", description: "Subset settings",
  settingsGroups: {
    all: {
      count: numberOption("Count", "Description.", undefined, { integer: true }),
      bounded: numberOption("Bounded", "Description.", 1, { min: 0, max: 10, integer: true })
    }
  }
});
const schema = { subset: card };
const defaults = createDefaultValues(schema).subset;

// An integer descriptor rejects fractional values with a message and resets to the default.
describe("integer settings", () => {
  it("accepts whole numbers and unset optional values", () => {
    const rows = readSettingsRows(card, "subset", defaults, { objects: [{ subset: { count: 3, bounded: 0 } }, {}] }, [0, 1]);
    expect(rows.values).toEqual([{ count: 3, bounded: 0 }, { count: undefined, bounded: 1 }]);
    expect(rows.validation).toEqual({ status: 0, messages: [[], []] });
  });

  it("rejects fractional values with a whole-number message and resets them", () => {
    const rows = readSettingsRows(card, "subset", defaults, { objects: [{ subset: { count: 2.5, bounded: 9.5 } }] }, [0]);
    expect(rows.values).toEqual([{ count: undefined, bounded: 1 }]);
    expect(rows.validation.messages[0]).toEqual([
      "2.5 is not a valid value for count. Valid values are whole numbers",
      "9.5 is not a valid value for bounded. Valid values are whole numbers"
    ]);
    expect(rows.validation.status).toBe(1);
  });

  it("treats Core's counts and decimal places as whole numbers", () => {
    const axis = createAxisCard("y", { tickRotation: 0, limitUnits: "a value" });
    const rows = readSettingsRows(axis, "y_axis", createDefaultValues({ y_axis: axis }).y_axis,
      { objects: [{ y_axis: { ylimit_tick_count: 3.7, ylimit_sig_figs: 2.5 } }] }, [0]);
    expect(rows.values[0].ylimit_tick_count).toBe(10);
    expect(rows.values[0].ylimit_sig_figs).toBeUndefined();
    expect(rows.validation.messages[0]).toEqual([
      "2.5 is not a valid value for ylimit_sig_figs. Valid values are whole numbers",
      "3.7 is not a valid value for ylimit_tick_count. Valid values are whole numbers"
    ]);
    expect(axis.ylimit_tick_count.displayName).toBe("Approximate Tick Count");
    expect(scalingOptions().sig_figs.integer).toBe(true);
    const labels = createLineGroup("99", { showLabel: "Show", showDescription: "Draws the line.", showDefault: true, width: 1, type: "10 0", colour: "limits", rebaselines: true });
    expect(labels.plot_label_show_n_99.integer).toBe(true);
  });

  it("keeps the integer flag out of the formatting-pane payload", () => {
    expect(card.settingsGroups.all.count.options).toBeUndefined();
    expect(card.settingsGroups.all.bounded.options).toEqual({ minValue: { value: 0 }, maxValue: { value: 10 } });
    const pane = buildFormattingModel(schema, { subset: defaults });
    const slices = pane.cards[0].groups[0].slices;
    for (let i = 0; i < slices.length; i++) {
      expect("integer" in slices[i].control.properties).toBe(false);
    }
  });
});
