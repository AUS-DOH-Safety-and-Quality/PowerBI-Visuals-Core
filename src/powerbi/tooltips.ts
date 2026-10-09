import type powerbi from "powerbi-visuals-api";
import isNullOrUndefined from "../data/isNullOrUndefined";
import type { ValueFormatter } from "../data/valueFormatter";

type VisualTooltipDataItem = powerbi.extensibility.VisualTooltipDataItem;
type Level = "68" | "95" | "99";
type Line = Level | "target" | "alt_target";

// The `valueTooltipOptions` values
export type ValueTooltipSettings = {
  readonly ttip_show_value: boolean;
  readonly ttip_label_value: string;
  readonly ttip_show_numerator: boolean;
  readonly ttip_label_numerator: string;
  readonly ttip_show_denominator: boolean;
  readonly ttip_label_denominator: string;
};

export type ValueTooltipRow = {
  readonly value: number;
  readonly numerator: number | undefined;
  readonly denominator: number | undefined;
};

// The limit and target lines' `createLineGroup` tooltip values
export type LimitTooltipSettings =
  { readonly [K in `show_${Line}` | `ttip_show_${Line}`]: boolean }
  & { readonly [K in `ttip_label_${Line}` | `ttip_label_${Level}_prefix_lower` | `ttip_label_${Level}_prefix_upper`]: string };

export type LimitTooltipRow = { readonly [K in `ll${Level}` | `ul${Level}` | "target" | "alt_target"]: number | undefined };

// Value, numerator and denominator; an "Automatic" value label takes the chart's name for it
export function valueTooltips(settings: ValueTooltipSettings, row: ValueTooltipRow, automaticLabel: string, format: ValueFormatter): VisualTooltipDataItem[] {
  const tooltip: VisualTooltipDataItem[] = [];
  if (settings.ttip_show_value) {
    tooltip.push({
      displayName: settings.ttip_label_value === "Automatic" ? automaticLabel : settings.ttip_label_value,
      value: format(row.value, "value")
    });
  }
  if (settings.ttip_show_numerator && !isNullOrUndefined(row.numerator)) {
    tooltip.push({ displayName: settings.ttip_label_numerator, value: format(row.numerator, "integer") });
  }
  if (settings.ttip_show_denominator && !isNullOrUndefined(row.denominator)) {
    tooltip.push({ displayName: settings.ttip_label_denominator, value: format(row.denominator, "integer") });
  }
  return tooltip;
}

// Upper limits from 99% in, the targets, then lower limits from 68% out; charts without limits show only targets
export function limitTooltips(settings: LimitTooltipSettings, row: LimitTooltipRow, format: ValueFormatter, controlLimits: boolean): VisualTooltipDataItem[] {
  const tooltip: VisualTooltipDataItem[] = [];
  const levels: Level[] = ["99", "95", "68"];
  const limit = (level: Level, side: "upper" | "lower"): void => {
    if (controlLimits && settings[`ttip_show_${level}`] && settings[`show_${level}`]) {
      const name = `${side === "upper" ? "ul" : "ll"}${level}` as const;
      tooltip.push({
        displayName: `${settings[`ttip_label_${level}_prefix_${side}`]}${settings[`ttip_label_${level}`]}`,
        value: format(row[name], "value")
      });
    }
  };
  for (let i = 0; i < levels.length; i++) {
    limit(levels[i], "upper");
  }
  if (settings.show_target && settings.ttip_show_target) {
    tooltip.push({ displayName: settings.ttip_label_target, value: format(row.target, "value") });
  }
  if (settings.show_alt_target && settings.ttip_show_alt_target && !isNullOrUndefined(row.alt_target)) {
    tooltip.push({ displayName: settings.ttip_label_alt_target, value: format(row.alt_target, "value") });
  }
  for (let i = levels.length - 1; i >= 0; i--) {
    limit(levels[i], "lower");
  }
  return tooltip;
}

// Flagged patterns as one item, then the report's own tooltip columns
export function appendPatternTooltips(tooltip: VisualTooltipDataItem[], patterns: readonly string[],
                                      custom: readonly VisualTooltipDataItem[] | undefined): void {
  if (patterns.length > 0) {
    tooltip.push({ displayName: "Pattern(s)", value: patterns.join("\n") });
  }
  if (custom !== undefined) {
    for (let i = 0; i < custom.length; i++) {
      tooltip.push(custom[i]);
    }
  }
}
