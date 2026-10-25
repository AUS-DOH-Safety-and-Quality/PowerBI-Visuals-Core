import at from "../util/at";
import type { ValueFormatter } from "../data/valueFormatter";
import type { LineLabel, LineLabelPosition } from "../rendering/lineLabels";
import type { LineStyle } from "../rendering/drawLines";
import type { TableColumn } from "../rendering/summaryTable";

export const limitLineNames = ["ll99", "ll95", "ll68", "ul68", "ul95", "ul99"] as const;

export type LimitLineName = typeof limitLineNames[number];

export type LimitLevel = "68" | "95" | "99";
export type LimitLine = LimitLevel | "target" | "alt_target";

/** The limit and target lines' `createLineGroup` visibility and label values */
export type LimitLineSettings =
  Readonly<Record<`show_${LimitLine}`, boolean>>
  & Readonly<Record<`ttip_label_${LimitLine}` | `ttip_label_${LimitLevel}_prefix_lower` | `ttip_label_${LimitLevel}_prefix_upper`, string>>;

/** Upper limits from 99% in, the targets, then lower limits from 68% out, as `limitTooltips` orders them */
export function limitColumns(lines: LimitLineSettings, controlLimits: boolean): TableColumn[] {
  const columns: TableColumn[] = [];
  const levels: LimitLevel[] = ["99", "95", "68"];
  const limit = (level: LimitLevel, side: "upper" | "lower"): void => {
    if (controlLimits && lines[`show_${level}`]) {
      columns.push({
        name: `${side === "upper" ? "ul" : "ll"}${level}`,
        label: `${lines[`ttip_label_${level}_prefix_${side}`]}${lines[`ttip_label_${level}`]}`
      });
    }
  };
  for (let i = 0; i < levels.length; i++) {
    limit(at(levels, i), "upper");
  }
  if (lines.show_target) {
    columns.push({ name: "target", label: lines.ttip_label_target });
  }
  if (lines.show_alt_target) {
    columns.push({ name: "alt_target", label: lines.ttip_label_alt_target });
  }
  for (let i = levels.length - 1; i >= 0; i--) {
    limit(at(levels, i), "lower");
  }
  return columns;
}

/** Lower limit lines place their outside labels below the line */
export const lowerLimitLines: ReadonlySet<string> = new Set(["ll99", "ll95", "ll68"]);

/** The limit and target lines every visual draws, named to their `createLineGroup` keys */
export const standardLineKeys = {
  ll99: "99",
  ll95: "95",
  ll68: "68",
  ul68: "68",
  ul95: "95",
  ul99: "99",
  target: "target",
  alt_target: "alt_target"
} as const;

export type StandardLineName = keyof typeof standardLineKeys;

/** A value per limit line */
export type LimitLineValues<T> = Record<LimitLineName, T>;

/** A value per limit and target line */
export type StandardLineValues<T> = Record<StandardLineName, T>;

export type LineSettingValues = Readonly<Record<string, unknown>>;

/** The `<setting>_<key>` value of one line */
// eslint-disable-next-line @typescript-eslint/no-unnecessary-type-parameters -- the key is built at runtime, so callers name its type
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

/** The line's value label at a point, styled and placed by its `plot_label_` settings */
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
