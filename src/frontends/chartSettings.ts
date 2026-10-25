import at from "../util/at";
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
    const groupName = at(groupNames, i);
    const group = inputSettings[groupName];
    if (group == null) {
      continue;
    }
    const groupDefaults = hasOwn(defaults, groupName) ? defaults[groupName] : undefined;
    if (groupDefaults === undefined) {
      return { error: `'${groupName}' is not a valid settings group. Valid options are: ${Object.keys(defaults).join(", ")}.` };
    }
    if (!isPlainObject(group)) {
      return { error: `Settings in group '${groupName}' must be named.` };
    }
    const groupSettings: Record<string, unknown> = {};
    const names = Object.keys(group);
    for (let j = 0; j < names.length; j++) {
      const name = at(names, j);
      if (!hasOwn(groupDefaults, name)) {
        const options = Object.keys(groupDefaults).join("', '");
        return { error: `Invalid setting '${name}' in group '${groupName}'. Valid settings are: '${options}'.` };
      }
      let value = group[name];
      if (isArray(value) && value.length === 1) {
        value = value[0];
      }
      if (isPlainObject(value) || (isArray(value) && value.length !== rowCount)) {
        return { error: `Setting '${name}' in group '${groupName}' must have one value or ${rowCount} values.` };
      }
      groupSettings[name] = typeof groupDefaults[name] === "string" ? asText(value) : value;
    }
    settings[groupName] = groupSettings;
  }
  return { settings };
}
