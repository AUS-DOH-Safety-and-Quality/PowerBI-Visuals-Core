import { FormattingComponent, type SettingCard, type SettingDefinition, type SettingValue, type SettingsValues } from "../settings/definitions.js";

export type FormattingDescriptor = {
  objectName: string;
  propertyName: string;
  selector?: { data: { dataViewWildcard: { matchingOption: 0 } }[] };
  instanceKind?: 3;
};
export type FormattingItem = { displayName: string; value: string };
export type FormattingControl = {
  type: SettingDefinition["type"];
  properties: {
    descriptor: FormattingDescriptor;
    value: SettingValue | FormattingItem | { value: string };
    items?: FormattingItem[];
    options?: SettingDefinition["options"];
  };
};
export type FormattingSlice = { uid: string; displayName: string; control: FormattingControl };
export type FormattingGroup = { uid: string; displayName: string; slices: FormattingSlice[] };
export type FormattingCard = {
  uid: string;
  description: string;
  displayName: string;
  groups: FormattingGroup[];
  revertToDefaultDescriptors: FormattingDescriptor[];
};
export type FormattingModel = { cards: FormattingCard[] };

export default function buildFormattingModel<T extends Record<string, SettingCard>>(
  schema: T, values: NoInfer<SettingsValues<T>>
): FormattingModel {
  const settingsValues: Readonly<Record<string, Readonly<Record<string, SettingValue>>>> = values;
  const cards: FormattingCard[] = [];
  const names = Object.keys(schema);
  for (let i = 0; i < names.length; i++) {
    const name = names[i];
    const definition: SettingCard = schema[name];
    const groups = [];
    const descriptors: FormattingDescriptor[] = [];
    const groupNames = Object.keys(definition.settingsGroups);
    const values: Readonly<Record<string, SettingValue>> = settingsValues[name];
    for (let j = 0; j < groupNames.length; j++) {
      const groupName = groupNames[j];
      const definitions = definition.settingsGroups[groupName];
      const settingNames = Object.keys(definitions);
      const slices = [];
      for (let k = 0; k < settingNames.length; k++) {
        const settingName = settingNames[k];
        const setting = definitions[settingName];
        descriptors.push({ objectName: name, propertyName: settingName });
        const descriptor: FormattingDescriptor = { objectName: name, propertyName: settingName };
        if (!setting.constant) {
          descriptor.selector = { data: [{ dataViewWildcard: { matchingOption: 0 } }] };
          if (setting.type !== FormattingComponent.ToggleSwitch) descriptor.instanceKind = 3;
        }
        const value = values[settingName];
        const control: FormattingControl = { type: setting.type, properties: { descriptor, value } };
        if (setting.type === FormattingComponent.ColorPicker) {
          if (typeof value !== "string") throw new Error(`Missing colour for ${name}.${settingName}`);
          control.properties.value = { value };
        } else if (setting.type === FormattingComponent.Dropdown && setting.items !== undefined) {
          control.properties.items = setting.items;
          control.properties.value = undefined;
          for (let l = 0; l < setting.items.length; l++) {
            if (setting.items[l].value === value) {
              control.properties.value = setting.items[l];
              break;
            }
          }
        }
        if (setting.options !== undefined) control.properties.options = setting.options;
        slices.push({ uid: name + "_" + groupName + "_" + settingName + "_slice_uid", displayName: setting.displayName, control });
      }
      groups.push({ displayName: groupName === "all" ? definition.displayName : groupName, uid: name + "_" + groupName + "_uid", slices });
    }
    cards.push({ description: definition.description, displayName: definition.displayName,
      uid: name + "_card_uid", groups, revertToDefaultDescriptors: descriptors });
  }
  return { cards };
}
