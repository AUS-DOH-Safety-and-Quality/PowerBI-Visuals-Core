import {
  createDefaultValues, defineCard, dropdownOption, numberOption, textOption, toggleOption
} from "../src/settings/index";

const schema = { data: defineCard({
  displayName: "Data", description: "Data", settingsGroups: {
    all: {
      count: numberOption("Count", 1),
      limit: numberOption("Limit", undefined),
      from: dropdownOption("From", "Start", ["Start", "End"]),
      enabled: toggleOption("Enabled", true),
      text: textOption("Text", "")
    }
  }
}) };
const values = createDefaultValues(schema);
const count: number = values.data.count;
const limit: number | undefined = values.data.limit;
const from: "Start" | "End" = values.data.from;
void [count, limit, from];
values.data.count = 2;
values.data.limit = 3;
values.data.limit = undefined;
values.data.from = "End";
values.data.enabled = false;
values.data.text = "Changed";
// @ts-expect-error Required numeric defaults do not admit undefined.
values.data.count = undefined;
// @ts-expect-error Optional settings are still named required properties.
const missing: typeof values.data = { count: 1, from: "Start", enabled: true, text: "" };
void missing;
// @ts-expect-error Dropdown values retain the declared literal union.
values.data.from = "Middle";
// @ts-expect-error The initial selection must belong to the valid values.
dropdownOption("From", "Middle", ["Start", "End"]);
// @ts-expect-error Explicit labels must match the choice count.
dropdownOption("From", "Start", ["Start", "End"], "none", ["First"]);
// @ts-expect-error Numeric settings cannot have text defaults.
numberOption("Count", "1");
// @ts-expect-error Null is not an internal missing-setting sentinel.
numberOption("Count", null);
