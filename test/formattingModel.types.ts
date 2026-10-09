import { buildFormattingModel } from "../src/powerbi/index";
import { defineCard, createDefaultValues, numberOption, toggleOption, dropdownOption } from "../src/settings/index";

const schema = { example: defineCard({ displayName: "Example", description: "", settingsGroups: { all: {
  count: numberOption("Count", undefined),
  enabled: toggleOption("Enabled", true),
  mode: dropdownOption("Mode", "first", ["first", "second"])
} } }) };
const values = createDefaultValues(schema);
buildFormattingModel(schema, values);
// @ts-expect-error Optional values retain named properties.
buildFormattingModel(schema, { example: { enabled: true, mode: "first" } });
// @ts-expect-error Values cannot broaden the schema's dropdown choices.
buildFormattingModel(schema, { example: { ...values.example, mode: "invalid" } });
// @ts-expect-error Numeric controls do not accept text.
buildFormattingModel(schema, { example: { ...values.example, count: "1" } });
// @ts-expect-error Internal unset values use undefined.
buildFormattingModel(schema, { example: { ...values.example, count: null } });
