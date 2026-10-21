import type powerbi from "powerbi-visuals-api";
import { FormattingComponent, type SettingDefinition } from "../src/settings/index";
import { select, type SvgSelection, type ViewModelValidation } from "../src/rendering/index";
import type { UpdateOptions } from "../src/powerbi/index";
import { chartTitle, registerChart, type Aggregations, type FrontendVisual, type SettingsModel, type TitleSettings } from "../src/frontends/index";

type IVisualHost = powerbi.extensibility.visual.IVisualHost;
type VisualConstructorOptions = powerbi.extensibility.visual.VisualConstructorOptions;

function setting(value: string | number): SettingDefinition {
  return { displayName: "", description: "", type: FormattingComponent.TextInput, default: value };
}

function card(settings: Record<string, SettingDefinition>): SettingsModel[string] {
  return { displayName: "", description: "", settingsGroups: { all: settings } };
}

/** Each value missing is a warning, and every value missing an error */
function validate(options: UpdateOptions): ViewModelValidation {
  const values = options.dataViews?.[0]?.categorical?.values?.[0]?.values ?? [];
  let missing = 0;
  for (let i = 0; i < values.length; i++) {
    if (values[i] == null) {
      missing++;
    }
  }
  if (missing === values.length) {
    return { status: false, error: "No values" };
  }
  return missing === 0 ? { status: true } : { status: true, warning: `${missing} missing` };
}

/** The first row's chart type "table" stands for a visual's table view */
function drawsTable(options: UpdateOptions): boolean {
  return options.dataViews?.[0]?.categorical?.categories?.[0]?.objects?.[0]?.spc?.chart_type === "table";
}

/** Records its updates, drawing an error message when every value is missing */
export class TestVisual implements FrontendVisual {
  static readonly instances: TestVisual[] = [];
  readonly host: IVisualHost;
  readonly svg: SvgSelection;
  /** Keeps the data it was last updated with, as the visuals' view models keep their calculations */
  readonly viewModel: { options?: UpdateOptions; update(options: UpdateOptions): ViewModelValidation };
  readonly updates: UpdateOptions[] = [];
  highlights = 0;
  showsTable = false;

  constructor(options: VisualConstructorOptions) {
    this.host = options.host;
    this.svg = select(options.element).append("svg");
    this.viewModel = {
      update: updateOptions => {
        this.viewModel.options = updateOptions;
        return validate(updateOptions);
      }
    };
    TestVisual.instances.push(this);
  }

  update(options: UpdateOptions): ViewModelValidation {
    this.updates.push(options);
    this.svg.selectAll("*").remove();
    const status = this.viewModel.update(options);
    this.showsTable = status.status && drawsTable(options);
    if (!status.status) {
      this.svg.append("text").classed("errormessage", true).text(status.error);
    }
    return status;
  }

  updateHighlighting(): void {
    this.highlights++;
  }
}

export const testSettingsModel: SettingsModel = {
  canvas: card({ upper_padding: setting(10), left_padding: setting(10), lower_padding: setting(10), right_padding: setting(10) }),
  x_axis: card({ xlimit_tick_size: setting(10), xlimit_tick_rotation: setting(0) }),
  spc: card({ chart_type: setting("i") }),
  misc: card({ group: setting("") })
};

export const defaultAggregations: Aggregations = {
  numerators: "sum", denominators: "sum", groupings: "first", xbar_sds: "first", tooltips: "first", labels: "first"
};

export function titleSettings(title: unknown): TitleSettings {
  const parsed = chartTitle(title);
  if ("error" in parsed) {
    throw new Error(parsed.error);
  }
  return parsed.settings;
}

registerChart("test", {
  Visual: TestVisual,
  settingsModel: testSettingsModel,
  limitColumns: ["value"],
  limits: () => ({})
});
