import { describe, expect, it } from "vitest";
import { createLineGroup, defineCard, createDefaultValues, numberOption, toggleOption } from "../src/settings/index";

describe("line group factory", () => {
  it("orders a full group as show, extras, style, join, tooltip, prefixes, then value labels", () => {
    const group = createLineGroup("68", {
      showLabel: "Show 68% Lines",
      showDefault: false,
      width: 2,
      type: "2 5",
      colour: "limits",
      rebaselines: true,
      tooltipLabel: "68% Limit",
      tooltipPrefixes: true
    }, { extra_68: numberOption("Extra", undefined), multiplier_68: toggleOption("Multiply", false) });
    expect(Object.keys(group)).toEqual([
      "show_68", "extra_68", "multiplier_68", "width_68", "type_68", "colour_68", "opacity_68", "opacity_unselected_68",
      "join_rebaselines_68", "ttip_show_68", "ttip_label_68", "ttip_label_68_prefix_lower", "ttip_label_68_prefix_upper",
      "plot_label_show_68", "plot_label_show_all_68", "plot_label_show_n_68", "plot_label_position_68",
      "plot_label_vpad_68", "plot_label_hpad_68", "plot_label_font_68", "plot_label_size_68", "plot_label_colour_68", "plot_label_prefix_68"
    ]);
    expect(group.show_68).toEqual({ displayName: "Show 68% Lines", type: "ToggleSwitch", default: false });
    expect(group.width_68.default).toBe(2);
    expect(group.type_68.default).toBe("2 5");
    expect(group.colour_68.default).toBe("#6495ED");
    expect(group.ttip_label_68.default).toBe("68% Limit");
    expect(group.ttip_label_68_prefix_lower.default).toBe("Lower ");
    expect(group.plot_label_show_n_68.options).toEqual({ minValue: { value: 1 } });
  });

  it("omits re-baseline, tooltip and prefix settings unless asked and prefixes style names", () => {
    const group = createLineGroup("main", {
      showLabel: "Show Main Line",
      showDefault: true,
      namePrefix: "Main ",
      width: 1,
      type: "10 0",
      colour: "common_cause",
      rebaselines: false
    });
    expect(Object.keys(group)).toEqual([
      "show_main", "width_main", "type_main", "colour_main", "opacity_main", "opacity_unselected_main",
      "plot_label_show_main", "plot_label_position_main", "plot_label_vpad_main", "plot_label_hpad_main",
      "plot_label_font_main", "plot_label_size_main", "plot_label_colour_main", "plot_label_prefix_main"
    ]);
    expect(group.width_main.displayName).toBe("Main Line Width");
    expect(group.type_main.displayName).toBe("Main Line Type");
    expect(group.colour_main.displayName).toBe("Main Line Colour");
  });

  it("feeds a card with flat typed values", () => {
    const card = defineCard({ displayName: "Lines", description: "Lines", settingsGroups: {
      Target: createLineGroup("target", {
        showLabel: "Show Target",
        showDefault: true,
        width: 1.5,
        type: "10 0",
        colour: "standard",
        rebaselines: false,
        tooltipLabel: "Centerline"
      })
    } });
    const values = createDefaultValues({ lines: card }).lines;
    expect(values.show_target).toBe(true);
    expect(values.ttip_label_target).toBe("Centerline");
    expect(values.plot_label_position_target).toBe("beside");
    expect(card.width_target.default).toBe(1.5);
  });
});
