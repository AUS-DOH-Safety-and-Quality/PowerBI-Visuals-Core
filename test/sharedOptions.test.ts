import { describe, expect, it } from "vitest";
import {
  createDownloadCard, createDefaultValues, defineCard, dotOptions, flagDirectionOptions, scalingOptions,
  valueTooltipOptions, limitTruncationOptions, toggleOption
} from "../src/settings/index";
import { pluck } from "./browserHelpers";

describe("shared setting options", () => {
  it("builds the download card", () => {
    const card = createDownloadCard();
    expect(card.displayName).toBe("Download Options");
    expect(Object.keys(card.settingsGroups.all)).toEqual(["show_button"]);
    expect(createDefaultValues({ download_options: card }).download_options).toEqual({ show_button: false });
  });

  it("keeps the option order when spread into a group", () => {
    const card = defineCard({ displayName: "Scatter", description: "Scatter", settingsGroups: {
      all: { show_dots: toggleOption("Show Scatter", true), ...dotOptions() }
    } });
    expect(Object.keys(card.settingsGroups.all)).toEqual([
      "show_dots", "shape", "size", "colour", "colour_outline", "width_outline", "opacity", "opacity_selected", "opacity_unselected"
    ]);
    expect(card.shape.valid).toEqual(["Circle", "Cross", "Diamond", "Square", "Star", "Triangle", "Wye"]);
    expect(createDefaultValues({ scatter: card }).scatter).toMatchObject({
      size: 2.5,
      colour: "#A6A6A6",
      opacity_unselected: 0.2
    });
  });

  it("provides the flag direction, scaling, tooltip and truncation options", () => {
    expect(Object.keys(flagDirectionOptions())).toEqual(["process_flag_type", "improvement_direction"]);
    expect(pluck(flagDirectionOptions().improvement_direction.items, "displayName")).toEqual(["Increase", "Neutral", "Decrease"]);
    expect(Object.keys(scalingOptions())).toEqual(["multiplier", "sig_figs", "perc_labels"]);
    expect(scalingOptions().sig_figs.options).toEqual({ minValue: { value: 0 }, maxValue: { value: 20 } });
    expect(Object.keys(valueTooltipOptions())).toEqual([
      "ttip_show_numerator", "ttip_label_numerator", "ttip_show_denominator", "ttip_label_denominator", "ttip_show_value", "ttip_label_value"
    ]);
    expect(valueTooltipOptions().ttip_label_value.default).toBe("Automatic");
    const truncation = limitTruncationOptions();
    expect(Object.keys(truncation)).toEqual(["ll_truncate", "ul_truncate"]);
    expect(Object.prototype.hasOwnProperty.call(truncation.ll_truncate, "default")).toBe(true);
    expect(truncation.ul_truncate.default).toBeUndefined();
  });
});
