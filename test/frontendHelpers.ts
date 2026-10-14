import type powerbi from "powerbi-visuals-api";
import { FormattingComponent, type SettingDefinition } from "../src/settings/index";
import { select, type SvgSelection, type ViewModelValidation } from "../src/rendering/index";
import type { UpdateOptions } from "../src/powerbi/index";
import { registerChart, type FrontendVisual, type SettingsModel } from "../src/frontends/index";

type IVisualHost = powerbi.extensibility.visual.IVisualHost;
type VisualConstructorOptions = powerbi.extensibility.visual.VisualConstructorOptions;

function setting(value: string | number, constant?: boolean): SettingDefinition {
  return { displayName: "", description: "", type: FormattingComponent.TextInput, default: value, constant };
}

function card(settings: Record<string, SettingDefinition>): SettingsModel[string] {
  return { displayName: "", description: "", settingsGroups: { all: settings } };
}

/** Records its updates, drawing an error message when every value is missing */
export class TestVisual implements FrontendVisual {
  static readonly instances: TestVisual[] = [];
  readonly host: IVisualHost;
  readonly svg: SvgSelection;
  readonly viewModel = { update: (): ViewModelValidation => ({ status: true }) };
  readonly updates: UpdateOptions[] = [];

  constructor(options: VisualConstructorOptions) {
    this.host = options.host;
    this.svg = select(options.element).append("svg");
    TestVisual.instances.push(this);
  }

  update(options: UpdateOptions): ViewModelValidation {
    this.updates.push(options);
    this.svg.selectAll("*").remove();
    const values = options.dataViews?.[0]?.categorical?.values?.[0]?.values ?? [];
    for (let i = 0; i < values.length; i++) {
      if (values[i] != null) {
        return { status: true };
      }
    }
    this.svg.append("text").classed("errormessage", true).text("No values");
    return { status: false, error: "No values" };
  }

  updateHighlighting(): void {}
}

registerChart("test", {
  Visual: TestVisual,
  settingsModel: {
    canvas: card({ upper_padding: setting(10), left_padding: setting(10), lower_padding: setting(10) }),
    x_axis: card({ xlimit_tick_size: setting(10), xlimit_tick_rotation: setting(0) }),
    spc: card({ chart_type: setting("i") }),
    misc: card({ group: setting("", true) })
  },
  limits: () => ({})
});
