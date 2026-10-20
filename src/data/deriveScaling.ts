import resolvePercentScaling from "./percentScaling";
import createValueFormatter, { type ValueFormatter } from "./valueFormatter";

/** The `scalingOptions` values */
export type ScalingSettings = {
  readonly multiplier: number;
  readonly sig_figs: number;
  readonly perc_labels: string;
};

export type ScalingOptions = {
  /** Proportions report as percentages when the scaling asks for them automatically */
  readonly proportion: boolean;
  /** Percent labels may be unsuitable, e.g. on transformed values */
  readonly percentAllowed: boolean;
};

export type DerivedScaling = {
  readonly multiplier: number;
  readonly percentLabels: boolean;
  readonly formatValue: ValueFormatter;
};

/** The multiplier, whether values show as percentages, and the formatter for values and input data */
export default function deriveScaling(settings: ScalingSettings, options: ScalingOptions): DerivedScaling {
  const scaling = resolvePercentScaling(options.proportion, settings.perc_labels, settings.multiplier);
  const percentLabels = scaling.percentLabels && options.percentAllowed;
  return {
    multiplier: scaling.multiplier,
    percentLabels,
    formatValue: createValueFormatter(settings.sig_figs, percentLabels ? "%" : "")
  };
}
