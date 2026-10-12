import { describe, expect, it } from "vitest";
import SettingsStore from "../src/powerbi/settingsStore";
import { defineCard, numberOption, toggleOption, createCanvasCard } from "../src/settings/index";

const schema = {
  canvas: createCanvasCard(),
  example: defineCard({
    displayName: "Example", description: "",
    settingsGroups: { all: {
      scale: numberOption("Scale", "", 2, { above: 0 }),
      doubled: toggleOption("Doubled", "", false)
    } }
  })
};

function createStore() {
  return new SettingsStore(schema, settings => settings.example.scale * (settings.example.doubled ? 2 : 1),
    [(settings, group) => settings.example.scale > 10 ? `Group ${group} scale too large` : undefined]);
}

describe("settings store", () => {
  it("starts from one group of defaults with its derived value", () => {
    const store = createStore();
    expect(store.settings).toHaveLength(1);
    expect(store.settings[0].example).toEqual({ scale: 2, doubled: false });
    expect(store.derivedSettings).toEqual([2]);
    expect(store.rowSettings).toEqual([]);
    expect(store.validationStatus).toEqual({ status: 0, messages: [] });
    expect(store.group(0)).toEqual({ settings: store.settings[0], derivedSettings: 2 });
    expect(store.getFormattingModel().cards).toHaveLength(2);
    expect(createStore().settings[0].example).not.toBe(store.settings[0].example);
  });

  it("reads each group's values and rows, deriving per group", () => {
    const store = createStore();
    const category = { objects: [{ example: { scale: 3, doubled: true } }, {}, { example: { scale: 4 } }, { example: { scale: 0 } }] };
    store.update(category, [[0, 1], [2, 3]]);
    expect(store.settings[0].example).toEqual({ scale: 3, doubled: true });
    expect(store.settings[1].example).toEqual({ scale: 4, doubled: false });
    expect(store.derivedSettings).toEqual([6, 4]);
    expect(store.rowSettings[0][1].example).toEqual({ scale: 2, doubled: false });
    expect(store.rowSettings[1][1].example).toEqual({ scale: 2, doubled: false });
    expect(store.validationStatus.status).toBe(0);
    expect(store.validationStatus.messages[3]).toEqual(["0 is not a valid value for scale. Valid values are numbers, above 0"]);
    expect(store.messagePositionByRowIndex.get(3)).toBe(3);
    expect(store.group(1).derivedSettings).toBe(4);
    expect(store.getFormattingModel().cards[1].groups[0].slices?.[0].control.properties.value).toBe(3);
  });

  it("fails the first group rule", () => {
    const store = createStore();
    store.update({ objects: [{}, { example: { scale: 11 } }] }, [[0], [1]]);
    expect(store.validationStatus).toMatchObject({ status: 1, error: "Group 1 scale too large" });
    expect(store.derivedSettings).toEqual([2, 11]);
  });
});
