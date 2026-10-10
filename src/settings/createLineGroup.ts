import {
  toggleOption, numberOption, lineTypeOption, colourOption, textOption,
  fontOption, fontSizeOption, lineLabelPositionOption,
  type SettingDefinition, type ColourName
} from "./definitions";

export type LineType = Parameters<typeof lineTypeOption>[2];

export type LineGroupOptions = {
  readonly showLabel: string;
  readonly showDescription: string;
  readonly showDefault: boolean;
  /** Prefixes the width, type and colour names, e.g. "Main " for "Main Line Width" */
  readonly namePrefix?: string;
  readonly width: number;
  readonly type: LineType;
  readonly colour: ColourName;
  /** Adds the re-baseline join and per-segment value label controls */
  readonly rebaselines: boolean;
  /** Adds the tooltip toggle and label, with this as the default label */
  readonly tooltipLabel?: string;
  /** Adds upper and lower tooltip label prefixes for paired limit lines */
  readonly tooltipPrefixes?: boolean;
};

type Suffixed<K extends string, T> = { [P in keyof T & string as `${P}_${K}`]: T[P] };
type TooltipPrefixes<K extends string> =
  Record<`ttip_label_${K}_prefix_lower` | `ttip_label_${K}_prefix_upper`, ReturnType<typeof textOption>>;

function showDefinition(options: LineGroupOptions) {
  return { show: toggleOption(options.showLabel, options.showDescription, options.showDefault) };
}

function styleDefinitions(options: LineGroupOptions) {
  const prefix = options.namePrefix ?? "";
  return {
    width: numberOption(`${prefix}Line Width`, "Line width, in pixels.", options.width, { min: 0, max: 100 }),
    type: lineTypeOption(`${prefix}Line Type`, "Dash pattern of the line.", options.type),
    colour: colourOption(`${prefix}Line Colour`, "Line colour.", options.colour),
    opacity: numberOption("Default Opacity", "Line opacity while nothing is selected.", 1, { min: 0, max: 1 }),
    opacity_unselected: numberOption("Opacity if Any Selected", "Line opacity while any point is selected.", 0.2, { min: 0, max: 1 })
  };
}

function joinDefinition() {
  return { join_rebaselines: toggleOption("Connect Rebaselined Limits", "Joins the line across a rebaseline; off leaves a gap.", false) };
}

function tooltipDefinitions(label: string) {
  return {
    ttip_show: toggleOption("Show value in tooltip", "Shows this line's value in the tooltip while the line is shown.", true),
    ttip_label: textOption("Tooltip Label", "Names this line in tooltips and any summary table.", label)
  };
}

function plotLabelShowDefinition() {
  return { plot_label_show: toggleOption("Show Value on Plot", "Writes the line's value at its right-hand end.", false) };
}

function plotLabelRebaselineDefinitions() {
  return {
    plot_label_show_all: toggleOption("Show Value at all Re-Baselines", "Writes the value in every rebaseline period.", false),
    plot_label_show_n: numberOption("Show Value at Last N Re-Baselines",
                                    "Writes the value in this many of the latest rebaseline periods.", 1, { min: 1, integer: true })
  };
}

function plotLabelDefinitions() {
  return {
    plot_label_position: lineLabelPositionOption(),
    plot_label_vpad: numberOption("Value Vertical Padding", "Vertical offset of the value from the line, in pixels.", 0),
    plot_label_hpad: numberOption("Value Horizontal Padding", "Horizontal gap between the value and the line's end, in pixels.", 10),
    plot_label_font: fontOption("Value Font", "Font of the value."),
    plot_label_size: fontSizeOption("Value Font Size", "Font size of the value, in pixels."),
    plot_label_colour: colourOption("Value Colour", "Colour of the value.", "standard"),
    plot_label_prefix: textOption("Value Prefix", "Text written before the value.", "")
  };
}

export type LineGroup<K extends string, O extends LineGroupOptions, E> =
  Suffixed<K, ReturnType<typeof showDefinition>> & E & Suffixed<K, ReturnType<typeof styleDefinitions>>
  & (O extends { rebaselines: true }
    ? Suffixed<K, ReturnType<typeof joinDefinition> & ReturnType<typeof plotLabelRebaselineDefinitions>> : unknown)
  & (O extends { tooltipLabel: string } ? Suffixed<K, ReturnType<typeof tooltipDefinitions>> : unknown)
  & (O extends { tooltipPrefixes: true } ? TooltipPrefixes<K> : unknown)
  & Suffixed<K, ReturnType<typeof plotLabelShowDefinition> & ReturnType<typeof plotLabelDefinitions>>;

function addSuffixed(group: Record<string, SettingDefinition>, key: string, definitions: Record<string, SettingDefinition>): void {
  const names = Object.keys(definitions);
  for (let i = 0; i < names.length; i++) {
    group[`${names[i]}_${key}`] = definitions[names[i]];
  }
}

/** One line's settings, named `<setting>_<key>`; extras follow the show toggle so they lead the pane */
export default function createLineGroup<const K extends string, const O extends LineGroupOptions,
  E extends Record<string, SettingDefinition> = Record<never, never>>(key: K, options: O, extras?: E): LineGroup<K, O, E> {
  const group: Record<string, SettingDefinition> = {};
  addSuffixed(group, key, showDefinition(options));
  if (extras !== undefined) {
    const names = Object.keys(extras);
    for (let i = 0; i < names.length; i++) {
      group[names[i]] = extras[names[i]];
    }
  }
  addSuffixed(group, key, styleDefinitions(options));
  if (options.rebaselines) {
    addSuffixed(group, key, joinDefinition());
  }
  if (options.tooltipLabel !== undefined) {
    addSuffixed(group, key, tooltipDefinitions(options.tooltipLabel));
    if (options.tooltipPrefixes) {
      group[`ttip_label_${key}_prefix_lower`] = textOption("Tooltip Label - Lower Prefix", "Text before the tooltip label for the lower line.", "Lower ");
      group[`ttip_label_${key}_prefix_upper`] = textOption("Tooltip Label - Upper Prefix", "Text before the tooltip label for the upper line.", "Upper ");
    }
  }
  addSuffixed(group, key, plotLabelShowDefinition());
  if (options.rebaselines) {
    addSuffixed(group, key, plotLabelRebaselineDefinitions());
  }
  addSuffixed(group, key, plotLabelDefinitions());
  return group as LineGroup<K, O, E>;
}
