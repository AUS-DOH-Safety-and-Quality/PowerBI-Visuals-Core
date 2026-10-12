import { createDefaultValues, type SettingCard, type SettingsValues } from "../settings/definitions";
import buildFormattingModel, { type FormattingModel } from "./buildFormattingModel";
import readSettingsGroups, { type SettingsGroupRule } from "./readSettingsGroups";
import type { SettingsCategory, SettingsValidation } from "./readSettingsRows";

/** One group's settings with what the visual derives from them */
export type GroupSettings<T extends Record<string, SettingCard>, D> = {
  readonly settings: SettingsValues<T>;
  readonly derivedSettings: D;
};

/** Each group's settings and derived values read from the category rows; one group of defaults until updated */
export default class SettingsStore<T extends Record<string, SettingCard>, D> {
  settings: SettingsValues<T>[];
  derivedSettings: D[];
  /** Each group's rows' own values */
  rowSettings: SettingsValues<T>[][] = [];
  validationStatus: SettingsValidation = { status: 0, messages: [] };
  messagePositionByRowIndex = new Map<number, number>();
  private readonly schema: T;
  private readonly derive: (settings: SettingsValues<T>) => D;
  private readonly rules: readonly SettingsGroupRule<SettingsValues<T>>[];

  constructor(schema: T, derive: (settings: SettingsValues<T>) => D, rules: readonly SettingsGroupRule<SettingsValues<T>>[] = []) {
    this.schema = schema;
    this.derive = derive;
    this.rules = rules;
    this.settings = [createDefaultValues(schema)];
    this.derivedSettings = [derive(this.settings[0])];
  }

  update(category: SettingsCategory, groups: readonly (readonly number[])[]): void {
    const result = readSettingsGroups(this.schema, category, groups, this.rules);
    this.settings = result.values;
    this.rowSettings = result.rowValues;
    this.validationStatus = result.validation;
    this.messagePositionByRowIndex = result.messagePositionByRowIndex;
    this.derivedSettings = new Array<D>(result.values.length);
    for (let i = 0; i < result.values.length; i++) {
      this.derivedSettings[i] = this.derive(result.values[i]);
    }
  }

  group(index: number): GroupSettings<T, D> {
    return { settings: this.settings[index], derivedSettings: this.derivedSettings[index] };
  }

  /** The pane for the first group */
  getFormattingModel(): FormattingModel {
    return buildFormattingModel(this.schema, this.settings[0]);
  }
}
