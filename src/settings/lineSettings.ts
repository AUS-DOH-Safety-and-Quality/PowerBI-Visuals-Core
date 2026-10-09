import type { ValueFormatter } from "../data/valueFormatter";
import type { LineLabel, LineLabelPosition } from "../rendering/lineLabels";
import type { LineStyle } from "../rendering/drawLines";

// Limit line names to their `createLineGroup` keys; visuals add their own target and value lines
export const limitLineKeys = { ll99: "99", ll95: "95", ll68: "68", ul68: "68", ul95: "95", ul99: "99" } as const;

export type LineSettingValues = Readonly<Record<string, unknown>>;

// The `<setting>_<key>` value of one line
export function lineSetting<T>(lines: LineSettingValues, setting: string, key: string): T {
  return lines[`${setting}_${key}`] as T;
}

export function lineStyle(lines: LineSettingValues, key: string): LineStyle {
  return {
    colour: lineSetting<string>(lines, "colour", key),
    width: lineSetting<number>(lines, "width", key),
    type: lineSetting<string>(lines, "type", key)
  };
}

export function lineOpacity(lines: LineSettingValues, key: string, active: boolean): number {
  return lineSetting<number>(lines, active ? "opacity_unselected" : "opacity", key);
}

export type LineLabelPoint = {
  readonly x: number;
  readonly y: number;
  readonly value: number;
};

// The line's value label at a point, styled and placed by its `plot_label_` settings
export function lineLabel(lines: LineSettingValues, key: string, point: LineLabelPoint, lower: boolean, format: ValueFormatter): LineLabel {
  return {
    text: lineSetting<string>(lines, "plot_label_prefix", key) + format(point.value, "value"),
    x: point.x,
    y: point.y,
    position: lineSetting<LineLabelPosition>(lines, "plot_label_position", key),
    lower,
    hpad: lineSetting<number>(lines, "plot_label_hpad", key),
    vpad: lineSetting<number>(lines, "plot_label_vpad", key),
    lineWidth: lineSetting<number>(lines, "width", key),
    size: lineSetting<number>(lines, "plot_label_size", key),
    font: lineSetting<string>(lines, "plot_label_font", key),
    colour: lineSetting<string>(lines, "plot_label_colour", key)
  };
}
