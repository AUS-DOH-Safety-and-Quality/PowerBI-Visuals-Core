import type powerbi from "powerbi-visuals-api";
import type { SvgSelection, ViewModelValidation } from "../rendering/plotVisual";
import type { UpdateOptions } from "../powerbi/updateOptions";
import { createDefaultValues, type SettingCard } from "../settings/definitions";

type IVisualHost = powerbi.extensibility.visual.IVisualHost;
type VisualConstructorOptions = powerbi.extensibility.visual.VisualConstructorOptions;

/** What the frontends drive on a visual */
export type FrontendVisual = {
  readonly host: IVisualHost;
  readonly svg: SvgSelection;
  readonly viewModel: { update(options: UpdateOptions, host: IVisualHost): ViewModelValidation };
  update(options: UpdateOptions): ViewModelValidation;
  updateHighlighting(): void;
};

export type SettingsModel = Readonly<Record<string, SettingCard>>;

/** A visual and what the frontends read from it beyond the plot */
export type FrontendChart<V extends FrontendVisual = FrontendVisual> = {
  readonly Visual: new (options: VisualConstructorOptions) => V;
  /** The settings inputs are validated against */
  readonly settingsModel: SettingsModel;
  /** Every column the limits can hold; indicators sharing a name are renamed */
  readonly limitColumns: readonly string[];
  /** The calculated values returned alongside the plot */
  limits(visual: V): Readonly<Record<string, unknown>>;
  /** Why the view cannot be returned as a static plot, if it cannot */
  staticError?(visual: V): string | undefined;
};

export type RegisteredChart = FrontendChart & { readonly defaultSettings: Readonly<Record<string, Readonly<Record<string, unknown>>>> };

const charts = new Map<string, RegisteredChart>();

export function registerChart<V extends FrontendVisual>(name: string, chart: FrontendChart<V>): void {
  charts.set(name, { ...chart, defaultSettings: createDefaultValues(chart.settingsModel) });
}

export function frontendChart(name: string): RegisteredChart {
  const chart = charts.get(name);
  if (chart === undefined) {
    throw new Error(`Unknown chart type '${name}'.`);
  }
  return chart;
}

export function chartNames(): string[] {
  return Array.from(charts.keys());
}
