import at from "../util/at";
import type { FormattingComponentKeys, SettingCard } from "../settings/definitions";

export type CapabilitiesObjects = Record<string, { properties: Record<string, { type: object }> }>;

/** The property types each pane component persists as, with keys sorted */
const persistedTypes: Record<FormattingComponentKeys, readonly string[]> = {
  AlignmentGroup: ['{"formatting":{"alignment":true}}'],
  ColorPicker: ['{"fill":{"solid":{"color":true}}}'],
  Dropdown: ['{"enumeration":[]}'],
  FontPicker: ['{"formatting":{"fontFamily":true}}'],
  NumUpDown: ['{"numeric":true}', '{"formatting":{"fontSize":true}}'],
  TextInput: ['{"text":true}'],
  ToggleSwitch: ['{"bool":true}']
};

function canonical(value: unknown): string {
  if (value === null || typeof value !== "object" || Array.isArray(value)) {
    return JSON.stringify(value);
  }
  const record = value as Record<string, unknown>;
  const keys = Object.keys(record).sort();
  const parts = new Array<string>(keys.length);
  for (let i = 0; i < keys.length; i++) {
    const key = at(keys, i);
    parts[i] = `${JSON.stringify(key)}:${canonical(record[key])}`;
  }
  return `{${parts.join(",")}}`;
}

/** Where the capabilities objects differ from the settings model; empty when they mirror it */
export default function capabilitiesMismatches(settingsModel: Record<string, SettingCard>, objects: CapabilitiesObjects,
                                               otherObjects: readonly string[] = []): string[] {
  const mismatches: string[] = [];
  const cards = Object.entries(settingsModel);
  for (let i = 0; i < cards.length; i++) {
    const [card, cardModel] = at(cards, i);
    const object = objects[card];
    if (object === undefined) {
      mismatches.push(`${card}: no capabilities object`);
      continue;
    }
    const modelled = new Set<string>();
    const groups = Object.values(cardModel.settingsGroups);
    for (let j = 0; j < groups.length; j++) {
      const definitions = Object.entries(at(groups, j));
      for (let k = 0; k < definitions.length; k++) {
        const [name, definition] = at(definitions, k);
        modelled.add(name);
        const property = object.properties[name];
        const component = definition.type;
        if (property === undefined) {
          mismatches.push(`${card}.${name}: missing`);
        } else if (!persistedTypes[component].includes(canonical(property.type))) {
          mismatches.push(`${card}.${name}: ${component} declared as ${JSON.stringify(property.type)}`);
        }
      }
    }
    const properties = Object.keys(object.properties);
    for (let j = 0; j < properties.length; j++) {
      const property = at(properties, j);
      if (!modelled.has(property)) {
        mismatches.push(`${card}.${property}: not in the settings model`);
      }
    }
  }
  const names = Object.keys(objects);
  for (let i = 0; i < names.length; i++) {
    const name = at(names, i);
    if (settingsModel[name] === undefined && !otherObjects.includes(name)) {
      mismatches.push(`${name}: not in the settings model`);
    }
  }
  for (let i = 0; i < otherObjects.length; i++) {
    const other = at(otherObjects, i);
    if (objects[other] === undefined) {
      mismatches.push(`${other}: no capabilities object`);
    }
  }
  return mismatches;
}
