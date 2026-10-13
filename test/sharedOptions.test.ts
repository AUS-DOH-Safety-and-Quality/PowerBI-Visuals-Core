import { describe, expect, it } from "vitest";
import {
  defineCard, dotOptions, flagDirectionOptions, scalingOptions, valueTooltipOptions, limitTruncationOptions, toggleOption
} from "../src/settings/index";
import { pluck } from "./browserHelpers";

describe("shared setting options", () => {
  it("keeps the option order when spread into a group", () => {
    const card = defineCard({ displayName: "Scatter", description: "Scatter", settingsGroups: {
      all: { show_dots: toggleOption("Show Scatter", "Description.", true), ...dotOptions() }
    } });
    expect(Object.keys(card.settingsGroups.all)).toEqual([
      "show_dots", "shape", "size", "colour", "colour_outline", "width_outline", "opacity", "opacity_selected", "opacity_unselected"
    ]);
    expect(card.shape.valid).toEqual(["Circle", "Cross", "Diamond", "Square", "Star", "Triangle", "Wye"]);
  });

  it("provides the flag direction, scaling, tooltip and truncation options", () => {
    expect(Object.keys(flagDirectionOptions())).toEqual(["process_flag_type", "improvement_direction"]);
    expect(pluck(flagDirectionOptions().improvement_direction.items, "displayName")).toEqual(["Increase", "Neutral", "Decrease"]);
    expect(Object.keys(scalingOptions())).toEqual(["multiplier", "sig_figs", "perc_labels"]);
    expect(scalingOptions().sig_figs.options).toEqual({ minValue: { value: 0 }, maxValue: { value: 20 } });
    expect(scalingOptions().multiplier).toMatchObject({ options: { minValue: { value: 0 } }, exclusiveMin: true });
    expect(Object.keys(valueTooltipOptions())).toEqual([
      "ttip_show_numerator", "ttip_label_numerator", "ttip_show_denominator", "ttip_label_denominator", "ttip_show_value", "ttip_label_value"
    ]);
    const truncation = limitTruncationOptions();
    expect(Object.keys(truncation)).toEqual(["ll_truncate", "ul_truncate"]);
    expect(Object.prototype.hasOwnProperty.call(truncation.ll_truncate, "default")).toBe(true);
  });
});
