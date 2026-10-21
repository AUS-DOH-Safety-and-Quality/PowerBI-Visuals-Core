import { frontendChart } from "./charts";
import { hasOwn, isArray, isPlainObject } from "./values";

/** Settings by card; a setting given per row is an array with one value per row */
export type InputSettings = Readonly<Record<string, Readonly<Record<string, unknown>>>>;

/** R and Python write numbers differently, so text settings take them as JavaScript names numeric keys */
function asText(value: unknown): unknown {
  if (typeof value === "number") {
    return String(value);
  }
  if (!isArray(value)) {
    return value;
  }
  const values = new Array<unknown>(value.length);
  for (let i = 0; i < value.length; i++) {
    values[i] = typeof value[i] === "number" ? String(value[i]) : value[i];
  }
  return values;
}

/** Settings are validated against the chart's settings model, and may give one value per row */
export function chartSettings(chartType: string, inputSettings: Readonly<Record<string, unknown>>,
                              rowCount: number): { settings: InputSettings } | { error: string } {
  const chart = frontendChart(chartType);
  const defaults = chart.defaultSettings;
  const settings: Record<string, Record<string, unknown>> = {};
  const groupNames = Object.keys(inputSettings);
  for (let i = 0; i < groupNames.length; i++) {
    const groupName = groupNames[i];
    const group = inputSettings[groupName];
    if (group == null) {
      continue;
    }
    if (!hasOwn(defaults, groupName)) {
      return { error: `'${groupName}' is not a valid settings group. Valid options are: ${Object.keys(defaults).join(", ")}.` };
    }
    if (!isPlainObject(group)) {
      return { error: `Settings in group '${groupName}' must be named.` };
    }
    const groupDefaults = defaults[groupName];
    const groupSettings: Record<string, unknown> = {};
    const names = Object.keys(group);
    for (let j = 0; j < names.length; j++) {
      if (!hasOwn(groupDefaults, names[j])) {
        const options = Object.keys(groupDefaults).join("', '");
        return { error: `Invalid setting '${names[j]}' in group '${groupName}'. Valid settings are: '${options}'.` };
      }
      let value = group[names[j]];
      if (isArray(value) && value.length === 1) {
        value = value[0];
      }
      if (isPlainObject(value) || (isArray(value) && value.length !== rowCount)) {
        return { error: `Setting '${names[j]}' in group '${groupName}' must have one value or ${rowCount} values.` };
      }
      groupSettings[names[j]] = typeof groupDefaults[names[j]] === "string" ? asText(value) : value;
    }
    settings[groupName] = groupSettings;
  }
  return { settings };
}
