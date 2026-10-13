import type powerbi from "powerbi-visuals-api";
import type { SettingCard } from "../settings/definitions";
import type SettingsStore from "../powerbi/settingsStore";
import { readColourPalette, type ColourPalette } from "../powerbi/colourPalette";
import { validateDataView, type ValidatedDataView } from "../powerbi/validateDataView";
import groupCategoryRows, { type CategoryGroups } from "../powerbi/groupCategoryRows";
import { updateType, type UpdateOptions } from "../powerbi/updateOptions";
import type { FormattingModel } from "../powerbi/buildFormattingModel";
import { axisRangeError, type AxisBounds } from "./plotFrame";
import type { ErrorKind } from "./errorMessage";
import type { ViewModelValidation } from "./plotVisual";

type IVisualHost = powerbi.extensibility.visual.IVisualHost;

/** Errors reject the update; warnings are shown while it stands */
export type GroupResults = { errors: string[]; warnings: string[] };

/** The update cycle the plot view models share: theme, data view, settings, then the visual's own data step */
export abstract class PlotViewModelBase<T extends Record<string, SettingCard>, D, R extends string> {
  readonly inputSettings: SettingsStore<T, D>;
  colourPalette: ColourPalette;
  svgWidth = 0;
  svgHeight = 0;
  headless = false;
  frontend = false;
  firstRun = true;
  private warning: string | undefined;
  private readonly valueRoles: readonly R[];

  constructor(host: IVisualHost, inputSettings: SettingsStore<T, D>, valueRoles: readonly R[]) {
    this.inputSettings = inputSettings;
    this.valueRoles = valueRoles;
    this.colourPalette = readColourPalette(host);
  }

  /** Whether the current view has axes whose ranges must be ordered */
  protected abstract get hasAxes(): boolean;
  abstract axisRanges(): { x: AxisBounds; y: AxisBounds };
  /** Clears what the last data step built */
  protected abstract reset(): void;
  /** Builds the visual's data from the validated view, one group per indicator combination */
  protected abstract updateData(view: ValidatedDataView<R>, groups: CategoryGroups, host: IVisualHost): GroupResults;

  getFormattingModel(): FormattingModel {
    return this.inputSettings.getFormattingModel();
  }

  update(options: UpdateOptions, host: IVisualHost): ViewModelValidation {
    // Read before any early return so error rendering is themed
    this.colourPalette = readColourPalette(host);
    const checkView = validateDataView(options.dataViews, this.valueRoles);
    if (checkView.status !== "valid") {
      return this.invalidate(checkView.error, checkView.status === "empty" ? "empty" : undefined);
    }
    const view = checkView.view;
    this.svgWidth = options.viewport.width;
    this.svgHeight = options.viewport.height;
    this.headless = options.headless ?? false;
    this.frontend = options.frontend ?? false;

    const groups = groupCategoryRows(view.categories.indicator ?? [], view.rowCount);
    // Data and Style updates both rebuild settings, so theme changes reach the derived values
    const dataChanged = (options.type & (updateType.data | updateType.style)) !== 0 || this.firstRun;
    if (dataChanged) {
      this.inputSettings.update(view.category, groups.rows);
    }
    const settingsValidation = this.inputSettings.validationStatus;
    if (settingsValidation.status !== 0) {
      return this.invalidate(settingsValidation.error, "settings");
    }
    if (dataChanged) {
      const results = this.updateData(view, groups, host);
      if (results.errors.length > 0) {
        return this.invalidate(results.errors.join("\n"));
      }
      this.warning = results.warnings.length > 0 ? results.warnings.join("\n") : undefined;
      this.firstRun = false;
    }
    if (this.hasAxes) {
      const rangeError = axisRangeError(this.axisRanges());
      if (rangeError !== undefined) {
        return this.invalidate(rangeError, "settings");
      }
    }
    return { status: true, warning: this.warning };
  }

  private invalidate(error: string, type?: ErrorKind): ViewModelValidation {
    this.reset();
    this.warning = undefined;
    this.firstRun = true;
    return { status: false, error, type };
  }
}
