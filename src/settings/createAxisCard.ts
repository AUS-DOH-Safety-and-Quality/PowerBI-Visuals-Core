import {
  defineCard, toggleOption, numberOption, colourOption, fontOption, fontSizeOption,
  textOption, dropdownOption, fontStyleOption, type SettingDefinition, type MergeUnions
} from "./definitions";

export type AxisName = "x" | "y";

export type AxisCardOptions = {
  readonly tickRotation: number;
};

type Prefixed<A extends AxisName, T> = { [P in keyof T & string as `${A}limit_${P}`]: T[P] };

function showDefinition(axis: AxisName) {
  return { show: toggleOption(`Show ${axis.toUpperCase()} Axis`, true) };
}

function colourDefinition() {
  return { colour: colourOption("Axis Colour", "standard") };
}

function sigFigsDefinition() {
  return { sig_figs: numberOption("Tick Decimal Places", undefined, { min: 0, max: 100 }) };
}

function limitDefinitions() {
  return { l: numberOption("Lower Limit", undefined), u: numberOption("Upper Limit", undefined) };
}

function tickDefinitions(rotation: number) {
  return {
    ticks: toggleOption("Draw Ticks", true),
    tick_marks: toggleOption("Draw Tick Marks", true),
    tick_count: numberOption("Maximum Ticks", 10, { min: 0, max: 100 }),
    tick_font: fontOption("Tick Font"),
    tick_size: fontSizeOption("Tick Font Size"),
    tick_colour: colourOption("Tick Font Colour", "standard"),
    tick_rotation: numberOption("Tick Rotation (Degrees)", rotation, { min: -360, max: 360 })
  };
}

function labelDefinitions() {
  return {
    label: textOption("Label", ""),
    label_font: fontOption("Label Font"),
    label_size: fontSizeOption("Label Font Size"),
    label_colour: colourOption("Label Font Colour", "standard"),
    label_style: fontStyleOption("Label Font Style")
  };
}

function xLabelAlign() {
  return { label_align: dropdownOption("Label Alignment", "center", ["left", "center", "right"], "sentence") };
}

function yLabelAlign() {
  return { label_align: dropdownOption("Label Alignment", "center", ["bottom", "center", "top"], "sentence") };
}

function gridDefinitions() {
  return {
    grid_show: toggleOption("Show Gridlines", false),
    grid_colour: colourOption("Gridline Colour", "lightgray"),
    grid_width: numberOption("Gridline Width", 1, { min: 0 })
  };
}

type AxisGroup<A extends AxisName, E> =
  Prefixed<A, ReturnType<typeof showDefinition>> & Prefixed<A, ReturnType<typeof colourDefinition>> & E
  & (A extends "y" ? Prefixed<A, ReturnType<typeof sigFigsDefinition>> : unknown)
  & Prefixed<A, ReturnType<typeof limitDefinitions>>;
type LabelGroup<A extends AxisName> = Prefixed<A, ReturnType<typeof labelDefinitions>
  & (A extends "x" ? ReturnType<typeof xLabelAlign> : ReturnType<typeof yLabelAlign>)>;

export type AxisCard<A extends AxisName, E> = {
  displayName: string;
  description: string;
  settingsGroups: {
    Axis: AxisGroup<A, E>;
    Ticks: Prefixed<A, ReturnType<typeof tickDefinitions>>;
    Label: LabelGroup<A>;
    Gridlines: Prefixed<A, ReturnType<typeof gridDefinitions>>;
  };
};

function addPrefixed(group: Record<string, SettingDefinition>, axis: AxisName, definitions: Record<string, SettingDefinition>): void {
  const names = Object.keys(definitions);
  for (let i = 0; i < names.length; i++) {
    group[`${axis}limit_${names[i]}`] = definitions[names[i]];
  }
}

// An axis card named `<axis>limit_<setting>`; extras sit in the Axis group after the colour
export default function createAxisCard<const A extends AxisName, E extends Record<string, SettingDefinition> = Record<never, never>>(
  axis: A, options: AxisCardOptions, extras?: E) {
  const axisGroup: Record<string, SettingDefinition> = {};
  addPrefixed(axisGroup, axis, showDefinition(axis));
  addPrefixed(axisGroup, axis, colourDefinition());
  if (extras !== undefined) {
    const names = Object.keys(extras);
    for (let i = 0; i < names.length; i++) {
      axisGroup[names[i]] = extras[names[i]];
    }
  }
  if (axis === "y") {
    addPrefixed(axisGroup, axis, sigFigsDefinition());
  }
  addPrefixed(axisGroup, axis, limitDefinitions());
  const ticks: Record<string, SettingDefinition> = {};
  addPrefixed(ticks, axis, tickDefinitions(options.tickRotation));
  const label: Record<string, SettingDefinition> = {};
  addPrefixed(label, axis, labelDefinitions());
  addPrefixed(label, axis, axis === "x" ? xLabelAlign() : yLabelAlign());
  const grid: Record<string, SettingDefinition> = {};
  addPrefixed(grid, axis, gridDefinitions());
  const name = `${axis.toUpperCase()} Axis Settings`;
  const card = defineCard({ displayName: name, description: name, settingsGroups: { Axis: axisGroup, Ticks: ticks, Label: label, Gridlines: grid } });
  type Groups = AxisCard<A, E>["settingsGroups"];
  return card as unknown as AxisCard<A, E> & MergeUnions<Groups[keyof Groups]>;
}
