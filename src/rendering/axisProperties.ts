import type { AxisLabelAlign } from "./axis";

export type AxisProperties = {
  lower: number;
  upper: number;
  start_padding: number;
  end_padding: number;
  colour: string;
  ticks: boolean;
  tick_marks: boolean;
  tick_size: string;
  tick_font: string;
  tick_colour: string;
  tick_rotation: number;
  tick_count: number;
  label: string;
  label_size: string;
  label_font: string;
  label_colour: string;
  label_style: string;
  label_align: AxisLabelAlign;
  grid_show: boolean;
  grid_colour: string;
  grid_width: number;
};

type AxisSettingFields = {
  colour: string; ticks: boolean; tick_marks: boolean; tick_count: number; tick_font: string; tick_size: number;
  tick_colour: string; tick_rotation: number; label: string; label_font: string; label_size: number; label_colour: string;
  label_style: string; label_align: AxisLabelAlign; grid_show: boolean; grid_colour: string; grid_width: number;
};
// The `<axis>limit_` settings an axis card provides, as read from the formatting pane
export type AxisSettingValues<A extends "x" | "y"> = { readonly [K in keyof AxisSettingFields as `${A}limit_${K}`]: AxisSettingFields[K] };
export type AxisRange = {
  readonly lower: number;
  readonly upper: number;
  readonly start_padding: number;
  readonly end_padding: number;
};
export type AxisPalette = {
  readonly isHighContrast: boolean;
  readonly foregroundColour: string;
};

// High-contrast hosts override every colour; a zero maximum tick count draws no ticks
export function axisPropertiesFromSettings<A extends "x" | "y">(axis: A, settings: AxisSettingValues<A>, palette: AxisPalette, range: AxisRange): AxisProperties {
  const values = settings as Readonly<Record<string, unknown>>;
  const value = <K extends keyof AxisSettingFields>(name: K): AxisSettingFields[K] => values[`${axis}limit_${name}`] as AxisSettingFields[K];
  const colour = (name: "colour" | "tick_colour" | "label_colour" | "grid_colour"): string => palette.isHighContrast ? palette.foregroundColour : value(name);
  return {
    lower: range.lower,
    upper: range.upper,
    start_padding: range.start_padding,
    end_padding: range.end_padding,
    colour: colour("colour"),
    ticks: value("ticks") && value("tick_count") !== 0,
    tick_marks: value("tick_marks"),
    tick_size: `${value("tick_size")}px`,
    tick_font: value("tick_font"),
    tick_colour: colour("tick_colour"),
    tick_rotation: value("tick_rotation"),
    tick_count: value("tick_count"),
    label: value("label"),
    label_size: `${value("label_size")}px`,
    label_font: value("label_font"),
    label_colour: colour("label_colour"),
    label_style: value("label_style"),
    label_align: value("label_align"),
    grid_show: value("grid_show"),
    grid_colour: colour("grid_colour"),
    grid_width: value("grid_width")
  };
}
