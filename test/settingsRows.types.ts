import { readSettingsRows, type SettingsValidation } from "../src/powerbi/index";
import { defineCard, createDefaultValues, numberOption, dropdownOption, textOption } from "../src/settings/index";

const card = defineCard({ displayName: "Data", description: "", settingsGroups: { all: {
  count: numberOption("Count", "Description.", 1),
  optional: numberOption("Optional", "Description.", undefined),
  mode: dropdownOption("Mode", "Description.", "first", ["first", "second"]),
  title: textOption("Title", "Description.", "Heading")
} } });
const defaults = createDefaultValues({ data: card }).data;
const category = { objects: [{ data: { count: null, title: "" } }] } as const;
const result = readSettingsRows(card, "data", defaults, category, [0] as const);
const count: number = result.values[0].count;
const optional: number | undefined = result.values[0].optional;
const mode: "first" | "second" = result.values[0].mode;
const text: string = result.values[0].title;
void [count, optional, mode, text];
if (result.validation.status === 1) {
  const error: string = result.validation.error;
  void error;
} else {
  const error: undefined = result.validation.error;
  void error;
}
// @ts-expect-error Optional numeric results must be narrowed before use as numbers.
const required: number = result.values[0].optional;
void required;
// @ts-expect-error Defaults cannot broaden a descriptor's dropdown choices.
readSettingsRows(card, "data", { ...defaults, mode: "invalid" }, category, [0]);
// @ts-expect-error Named optional properties must still be supplied in defaults.
readSettingsRows(card, "data", { count: 1, mode: "first", title: "" }, category, [0]);
// @ts-expect-error Missing category handling belongs to the consumer.
readSettingsRows(card, "data", defaults, undefined, []);
// @ts-expect-error A failure must carry its error.
const missingError: SettingsValidation = { status: 1, messages: [] };
// @ts-expect-error Success has no error string.
const successError: SettingsValidation = { status: 0, messages: [], error: "" };
void [missingError, successError];
