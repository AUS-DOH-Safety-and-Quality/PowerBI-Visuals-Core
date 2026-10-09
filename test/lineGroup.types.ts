import { createLineGroup, defineCard, createDefaultValues } from "../src/settings/index";

const withRebaselines = createLineGroup("99", { showLabel: "Show", showDefault: true, width: 2, type: "10 10", colour: "limits", rebaselines: true, tooltipLabel: "99% Limit", tooltipPrefixes: true });
const plain = createLineGroup("target", { showLabel: "Show", showDefault: true, width: 1.5, type: "10 0", colour: "standard", rebaselines: false });
const values = createDefaultValues({ lines: defineCard({ displayName: "L", description: "L", settingsGroups: { a: withRebaselines, b: plain } }) }).lines;

const shown: boolean = values.show_99;
const lineType: "10 0" | "10 10" | "2 5" = values.type_target;
const count: number = values.plot_label_show_n_99;
const prefix: string = values.ttip_label_99_prefix_upper;
const position: "outside" | "inside" | "above" | "below" | "beside" = values.plot_label_position_target;
void [shown, lineType, count, prefix, position];

// @ts-expect-error Re-baseline controls exist only when requested.
values.join_rebaselines_target;
// @ts-expect-error Tooltip settings exist only with a tooltip label.
values.ttip_show_target;
// @ts-expect-error Line types are the three dash patterns.
values.type_99 = "5 5";
