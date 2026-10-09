const FormattingComponent = {
  AlignmentGroup: "AlignmentGroup",
  ColorPicker: "ColorPicker",
  Dropdown: "Dropdown",
  FontPicker: "FontPicker",
  NumUpDown: "NumUpDown",
  TextInput: "TextInput",
  ToggleSwitch: "ToggleSwitch"
} as const;

type FormattingComponentKeys = keyof typeof FormattingComponent;

export type SettingValue = string | number | boolean | undefined;
export type SettingDefinition = {
  displayName: string;
  type: FormattingComponentKeys;
  default: SettingValue;
  valid?: readonly string[];
  items?: { displayName: string; value: string }[];
  options?: { minValue?: { value: number }; maxValue?: { value: number } };
  /** Validation only; not part of the formatting-pane payload. */
  integer?: boolean;
  constant?: boolean;
};
export type SettingCard = {
  displayName: string;
  description: string;
  settingsGroups: Record<string, Record<string, SettingDefinition>>;
};

const defaultColours = {
  improvement: "#00B0F0",
  deterioration: "#E46C0A",
  neutral_low: "#490092",
  neutral_high: "#490092",
  common_cause: "#A6A6A6",
  limits: "#6495ED",
  standard: "#000000",
  lightgray: "#D3D3D3",
  white: "#FFFFFF"
};

type NumberDefinition<T extends number | undefined> = {
  displayName: string;
  type: typeof FormattingComponent.NumUpDown;
  default: T;
  options?: SettingDefinition["options"];
  integer?: boolean;
};

type NumberBounds = { min?: number; max?: number; integer?: boolean };

function numberOption(displayName: string, defaultValue: number, minMax?: NumberBounds): NumberDefinition<number>;
function numberOption(displayName: string, defaultValue: number | undefined, minMax?: NumberBounds): NumberDefinition<number | undefined>;
function numberOption(displayName: string, defaultValue: number | undefined, minMax?: NumberBounds): NumberDefinition<number | undefined> {
  const result: NumberDefinition<number | undefined> = {
    displayName,
    type: FormattingComponent.NumUpDown,
    default: defaultValue
  };
  if (minMax !== undefined) {
    if (minMax.min !== undefined || minMax.max !== undefined) {
      result.options = {};
      if (minMax.min !== undefined) {
        result.options.minValue = { value: minMax.min };
      }
      if (minMax.max !== undefined) {
        result.options.maxValue = { value: minMax.max };
      }
    }
    if (minMax.integer) {
      result.integer = true;
    }
  }
  return result;
}

function toggleOption(displayName: string, defaultValue: boolean) {
  return {
    displayName: displayName,
    type: FormattingComponent.ToggleSwitch,
    default: defaultValue
  }
}

function paddingOption(displayName: string) {
  return numberOption(displayName, 10);
}

function colourOption(displayName: string, type: keyof typeof defaultColours) {
  return {
    displayName: displayName,
    type: FormattingComponent.ColorPicker,
    default: defaultColours[type]
  }
}

function fontOption(displayName: string) {
  return {
    displayName: displayName,
    type: FormattingComponent.FontPicker,
    default: "'Arial', sans-serif",
    valid: [
      "'Arial', sans-serif",
      "Arial",
      "'Arial Black'",
      "'Arial Unicode MS'",
      "Calibri",
      "Cambria",
      "'Cambria Math'",
      "Candara",
      "'Comic Sans MS'",
      "Consolas",
      "Constantia",
      "Corbel",
      "'Courier New'",
      "wf_standard-font, helvetica, arial, sans-serif",
      "wf_standard-font_light, helvetica, arial, sans-serif",
      "Georgia",
      "'Lucida Sans Unicode'",
      "'Segoe UI', wf_segoe-ui_normal, helvetica, arial, sans-serif",
      "'Segoe UI Light', wf_segoe-ui_light, helvetica, arial, sans-serif",
      "'Segoe UI Semibold', wf_segoe-ui_semibold, helvetica, arial, sans-serif",
      "'Segoe UI Bold', wf_segoe-ui_bold, helvetica, arial, sans-serif",
      "Symbol",
      "Tahoma",
      "'Times New Roman'",
      "'Trebuchet MS'",
      "Verdana",
      "Wingdings"
    ]
  }
}

function fontSizeOption(displayName: string) {
  return numberOption(displayName, 10, { min: 0, max: 100 });
}

type DropdownItem<T extends string> = { displayName: string; value: T };
const valueTransforms = {
  none: (value: string) => value,
  sentence: (value: string) => value.toLowerCase().replace(/\b\w/g, (char: string) => char.toUpperCase())
};

function dropdownOption<const Values extends readonly string[]>(
  displayName: string, defaultValue: NoInfer<Values[number]>, validValues: Values,
  displayTransform: keyof typeof valueTransforms = "none",
  displayNames?: { readonly [K in keyof Values]: string }
) {
  const valid = new Array<Values[number]>(validValues.length);
  const items = new Array<DropdownItem<Values[number]>>(validValues.length);
  const transform = valueTransforms[displayTransform];
  for (let i = 0; i < validValues.length; i++) {
    const value = validValues[i];
    valid[i] = value;
    items[i] = { displayName: displayNames === undefined ? transform(value) : displayNames[i], value };
  }
  return {
    displayName,
    type: FormattingComponent.Dropdown,
    default: defaultValue,
    valid,
    items
  };
}

function lineTypeOption(displayName: string, defaultValue: "10 0" | "10 10" | "2 5") {
  return dropdownOption(displayName, defaultValue, ["10 0", "10 10", "2 5"], "none", ["Solid", "Dashed", "Dotted"])
}

function textOption(displayName: string, defaultValue: string) {
  return {
    displayName: displayName,
    type: FormattingComponent.TextInput,
    default: defaultValue
  }
}

function lineLabelPositionOption() {
  return dropdownOption("Position of Value on Line(s)", "beside",
                        ["outside", "inside", "above", "below", "beside"],
                        "sentence");
}

const borderStyles = ["solid", "dotted", "dashed", "double", "groove", "ridge", "inset", "outset", "none"] as const;

function borderStyleOption(displayName: string, defaultValue: typeof borderStyles[number] = "solid") {
  return dropdownOption(displayName, defaultValue, borderStyles, "sentence");
}

function borderWidthOption(displayName: string) {
  return numberOption(displayName, 1, { min: 0 });
}

function alignmentOption(displayName: string) {
  return {
    displayName: displayName,
    type: FormattingComponent.AlignmentGroup,
    default: "center" as "center" | "left" | "right",
    valid: ["center", "left", "right"]
  }
}

const fontWeights = ["normal", "bold", "bolder", "lighter"] as const;

function fontWeightOption(displayName: string, defaultValue: typeof fontWeights[number] = "normal") {
  return dropdownOption(displayName, defaultValue, fontWeights, "sentence");
}

function fontStyleOption(displayName: string) {
  return dropdownOption(displayName, "normal", ["normal", "italic"], "sentence");
}

function textTransformOption(displayName: string) {
  return dropdownOption(
    displayName,
    "none",
    ["uppercase", "lowercase", "capitalize", "none"],
    "sentence"
  )
}

type MergeUnions<T> = (T extends unknown ? (value: T) => void : never) extends (value: infer Result) => void
  ? { [K in keyof Result]: Result[K] } : never;

type SettingMembers<T extends SettingCard> = MergeUnions<T["settingsGroups"][keyof T["settingsGroups"]]>;
export type ColourName = keyof typeof defaultColours;
export type CardValues<T extends SettingCard> = {
  [K in keyof SettingMembers<T>]: SettingMembers<T>[K] extends { default: infer Value extends SettingValue } ? Value : never;
};
export type SettingsValues<T extends Record<string, SettingCard>> = {
  [K in keyof T]: CardValues<T[K]>;
};

function defineCard<T extends SettingCard>(definition: T): T & SettingMembers<T> {
  const card = { ...definition };
  const groups = Object.keys(card.settingsGroups);
  for (let i = 0; i < groups.length; i++) {
    const group = card.settingsGroups[groups[i]];
    const names = Object.keys(group);
    for (let j = 0; j < names.length; j++) {
      const name = names[j];
      Object.defineProperty(card, name, { get: () => group[name] });
    }
  }
  return card as T & SettingMembers<T>;
}

function createDefaultValues<T extends Record<string, SettingCard>>(schema: T): SettingsValues<T> {
  const values: Record<string, Record<string, SettingValue>> = {};
  const cards = Object.keys(schema);
  for (let i = 0; i < cards.length; i++) {
    const name = cards[i];
    const groups = schema[name].settingsGroups;
    const groupNames = Object.keys(groups);
    const defaults: Record<string, SettingValue> = {};
    for (let j = 0; j < groupNames.length; j++) {
      const definitions = groups[groupNames[j]];
      const names = Object.keys(definitions);
      for (let k = 0; k < names.length; k++) {
        const setting = names[k];
        defaults[setting] = definitions[setting].default;
      }
    }
    values[name] = defaults;
  }
  return values as SettingsValues<T>;
}

export {
  FormattingComponent, type FormattingComponentKeys, type MergeUnions,
  paddingOption, colourOption, fontOption, fontSizeOption, lineTypeOption,
  toggleOption, numberOption, textOption, lineLabelPositionOption, dropdownOption,
  borderStyleOption, borderWidthOption, alignmentOption, fontWeightOption, fontStyleOption, textTransformOption,
  defineCard, createDefaultValues
};
