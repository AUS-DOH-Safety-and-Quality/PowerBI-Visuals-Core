import { describe, expect, it } from "vitest";
import { createAxisCard, createDefaultValues, numberOption } from "../src/settings/index";
import { axisPropertiesFromSettings } from "../src/rendering/index";
import { palette } from "./browserHelpers";

describe("axis card factory", () => {
  it("builds the x card with a show toggle and no decimal places", () => {
    const card = createAxisCard("x", { tickRotation: 0, limitUnits: "a value" });
    expect(card.displayName).toBe("X Axis Settings");
    expect(Object.keys(card.settingsGroups)).toEqual(["Axis", "Ticks", "Label", "Gridlines"]);
    expect(Object.keys(card.settingsGroups.Axis)).toEqual(["xlimit_show", "xlimit_colour", "xlimit_l", "xlimit_u"]);
    expect(card.xlimit_show).toEqual({
      displayName: "Show X Axis", description: "Draws the axis with its ticks, title and gridlines.", type: "ToggleSwitch", default: true
    });
    expect(card.xlimit_l.description).toBe("Lower end of the axis, as a value; blank sets it automatically.");
    expect(Object.keys(card.settingsGroups.Ticks)).toEqual([
      "xlimit_ticks", "xlimit_tick_marks", "xlimit_tick_count", "xlimit_tick_font", "xlimit_tick_size", "xlimit_tick_colour", "xlimit_tick_rotation"
    ]);
    expect(Object.keys(card.settingsGroups.Label)).toEqual([
      "xlimit_label", "xlimit_label_font", "xlimit_label_size", "xlimit_label_colour", "xlimit_label_style", "xlimit_label_align"
    ]);
    expect(Object.keys(card.settingsGroups.Gridlines)).toEqual(["xlimit_grid_show", "xlimit_grid_colour", "xlimit_grid_width"]);
    expect(card.xlimit_label_align.valid).toEqual(["left", "center", "right"]);
    expect(card.xlimit_tick_rotation.default).toBe(0);
  });

  it("builds the y card with extras after the colour, decimal places and vertical alignment", () => {
    const card = createAxisCard("y", { tickRotation: -35, limitUnits: "a value" }, { limit_multiplier: numberOption("Axis Scaling Factor", "Description.", 1.5, { min: 0 }) });
    expect(Object.keys(card.settingsGroups.Axis)).toEqual([
      "ylimit_show", "ylimit_colour", "limit_multiplier", "ylimit_sig_figs", "ylimit_l", "ylimit_u"
    ]);
    expect(card.ylimit_show.displayName).toBe("Show Y Axis");
    expect(card.ylimit_label_align.valid).toEqual(["bottom", "center", "top"]);
    expect(card.ylimit_tick_rotation.default).toBe(-35);
    const values = createDefaultValues({ y_axis: card }).y_axis;
    expect(values.ylimit_show).toBe(true);
    expect(values.limit_multiplier).toBe(1.5);
    expect(values.ylimit_sig_figs).toBeUndefined();
    expect(values.ylimit_grid_colour).toBe("#D3D3D3");
  });
});

describe("axis properties from settings", () => {
  const settings = createDefaultValues({ x_axis: createAxisCard("x", { tickRotation: -35, limitUnits: "a value" }) }).x_axis;
  const range = { lower: 0, upper: 10, start_padding: 30, end_padding: 10 };

  it("copies the range, sizes in pixels and settings colours", () => {
    const properties = axisPropertiesFromSettings("x", settings, palette, range);
    expect(properties).toMatchObject({
      lower: 0,
      upper: 10,
      start_padding: 30,
      end_padding: 10,
      colour: "#000000",
      ticks: true,
      tick_marks: true,
      tick_size: "10px",
      tick_rotation: -35,
      tick_count: 10,
      label_size: "10px",
      label_align: "center",
      label_style: "normal",
      grid_show: false,
      grid_colour: "#D3D3D3",
      grid_width: 1
    });
  });

  it("uses the host foreground for every colour in high contrast", () => {
    const properties = axisPropertiesFromSettings("x", settings, { isHighContrast: true, foregroundColour: "#ffffff" }, range);
    expect([properties.colour, properties.tick_colour, properties.label_colour, properties.grid_colour]).toEqual(["#ffffff", "#ffffff", "#ffffff", "#ffffff"]);
  });

  it("draws no ticks when the maximum tick count is zero", () => {
    expect(axisPropertiesFromSettings("x", { ...settings, xlimit_tick_count: 0 }, palette, range).ticks).toBe(false);
    expect(axisPropertiesFromSettings("x", { ...settings, xlimit_ticks: false }, palette, range).ticks).toBe(false);
  });
});
