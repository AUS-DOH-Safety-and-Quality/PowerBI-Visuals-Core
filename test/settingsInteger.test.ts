import { describe, expect, it } from "vitest";
import { readSettingsRows, buildFormattingModel } from "../src/powerbi/index";
import { defineCard, createDefaultValues, numberOption } from "../src/settings/index";

const card = defineCard({
  displayName: "Subset", description: "Subset settings",
  settingsGroups: {
    all: {
      count: numberOption("Count", undefined, { integer: true }),
      bounded: numberOption("Bounded", 1, { min: 0, max: 10, integer: true })
    }
  }
});
const schema = { subset: card };
const defaults = createDefaultValues(schema).subset;

// Core finding 16: an integer descriptor rejects fractional values with a message and resets to the default.
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
