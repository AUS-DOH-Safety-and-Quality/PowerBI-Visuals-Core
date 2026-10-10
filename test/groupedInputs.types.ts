import { readSettingsGroups } from "../src/powerbi/index";
import { defineCard, dropdownOption, numberOption } from "../src/settings/index";

const schema = { data: defineCard({ displayName: "Data", description: "", settingsGroups: { all: {
  size: numberOption("Size", "Description.", undefined), mode: dropdownOption("Mode", "Description.", "first", ["first", "second"])
} } }) };
const result = readSettingsGroups(schema, {}, [[0], [1]] as const);
const mode: "first" | "second" = result.values[0].data.mode;
const size: number | undefined = result.values[0].data.size;
// @ts-expect-error Unset numbers require narrowing.
const required: number = result.values[0].data.size;
// @ts-expect-error Dropdown unions remain narrow across groups.
result.values[0].data.mode = "invalid";
void [mode, size, required];
