import {
  defineCard, toggleOption, numberOption, colourOption, fontOption, fontSizeOption,
  textOption, dropdownOption, fontStyleOption, type SettingDefinition, type MergeUnions
} from "./definitions";

export type AxisName = "x" | "y";

export type AxisCardOptions = {
  readonly tickRotation: number;
  /** What the axis limits are entered as, e.g. "a plotted value" */
  readonly limitUnits: string;
};

type Prefixed<A extends AxisName, T> = { [P in keyof T & string as `${A}limit_${P}`]: T[P] };

function showDefinition(axis: AxisName) {
  return { show: toggleOption(`Show ${axis.toUpperCase()} Axis`, "Draws the axis with its ticks, title and gridlines.", true) };
}

function colourDefinition() {
  return { colour: colourOption("Axis Colour", "Colour of the axis line and tick marks.", "standard") };
}

function sigFigsDefinition() {
  return {
    sig_figs: numberOption("Tick Decimal Places", "Decimal places for the tick values; blank uses Decimals to Report.",
                           undefined, { min: 0, max: 100, integer: true })
  };
}

function limitDefinitions(units: string) {
  return {
    l: numberOption("Lower Limit", `Lower end of the axis, as ${units}; blank sets it automatically.`, undefined),
    u: numberOption("Upper Limit", `Upper end of the axis, as ${units}; blank sets it automatically.`, undefined)
  };
}

function tickDefinitions(rotation: number) {
  return {
    ticks: toggleOption("Draw Ticks", "Draws ticks and their values.", true),
    tick_marks: toggleOption("Draw Tick Marks", "Draws the short tick lines beside the values.", true),
    tick_count: numberOption("Approximate Tick Count", "Rough number of ticks; nearby round values are chosen. 0 draws none.",
                             10, { min: 0, max: 100, integer: true }),
    tick_font: fontOption("Tick Font", "Font of the tick values."),
    tick_size: fontSizeOption("Tick Font Size", "Font size of the tick values, in pixels."),
    tick_colour: colourOption("Tick Font Colour", "Colour of the tick values.", "standard"),
    tick_rotation: numberOption("Tick Rotation (Degrees)", "Rotation of the tick values, in degrees.", rotation, { min: -360, max: 360 })
  };
}

function labelDefinitions() {
  return {
    label: textOption("Label", "Axis title.", ""),
    label_font: fontOption("Label Font", "Font of the axis title."),
    label_size: fontSizeOption("Label Font Size", "Font size of the axis title, in pixels."),
    label_colour: colourOption("Label Font Colour", "Colour of the axis title.", "standard"),
    label_style: fontStyleOption("Label Font Style", "Font style of the axis title.")
  };
}

function xLabelAlign() {
  return { label_align: dropdownOption("Label Alignment", "Where the title sits along the axis.", "center", ["left", "center", "right"], "sentence") };
}

function yLabelAlign() {
  return { label_align: dropdownOption("Label Alignment", "Where the title sits along the axis.", "center", ["bottom", "center", "top"], "sentence") };
}

function gridDefinitions() {
  return {
    grid_show: toggleOption("Show Gridlines", "Draws a gridline at each tick.", false),
    grid_colour: colourOption("Gridline Colour", "Gridline colour.", "lightgray"),
    grid_width: numberOption("Gridline Width", "Gridline width, in pixels.", 1, { min: 0 })
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

/** An axis card named `<axis>limit_<setting>`; extras sit in the Axis group after the colour */
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
  addPrefixed(axisGroup, axis, limitDefinitions(options.limitUnits));
  const ticks: Record<string, SettingDefinition> = {};
  addPrefixed(ticks, axis, tickDefinitions(options.tickRotation));
  const label: Record<string, SettingDefinition> = {};
  addPrefixed(label, axis, labelDefinitions());
  addPrefixed(label, axis, axis === "x" ? xLabelAlign() : yLabelAlign());
  const grid: Record<string, SettingDefinition> = {};
  addPrefixed(grid, axis, gridDefinitions());
  const name = `${axis.toUpperCase()} Axis Settings`;
  const card = defineCard({
    displayName: name,
    description: name,
    settingsGroups: {
      Axis: axisGroup,
      Ticks: ticks,
      Label: label,
      Gridlines: grid
    }
  });
  type Groups = AxisCard<A, E>["settingsGroups"];
  return card as unknown as AxisCard<A, E> & MergeUnions<Groups[keyof Groups]>;
}
