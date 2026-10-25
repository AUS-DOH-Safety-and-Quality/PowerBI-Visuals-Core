import at from "../util/at";
import { FormattingComponent, groupDisplayName, type SettingCard, type SettingDefinition, type SettingValue, type SettingsValues } from "../settings/definitions";

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
export type FormattingSlice = { uid: string; displayName: string; infoIconText: string; control: FormattingControl };
export type FormattingGroup = { uid: string; displayName: string; slices: FormattingSlice[] };
export type FormattingCard = {
  readonly uid: string;
  readonly description: string;
  readonly displayName: string;
  readonly groups: FormattingGroup[];
  readonly revertToDefaultDescriptors: FormattingDescriptor[];
};
export type FormattingModel = { cards: FormattingCard[] };

export default function buildFormattingModel<T extends Record<string, SettingCard>>(
  schema: T, values: NoInfer<SettingsValues<T>>
): FormattingModel {
  const settingsValues: Readonly<Record<string, Readonly<Record<string, SettingValue>>>> = values;
  const cards: FormattingCard[] = [];
  const cardEntries = Object.entries<SettingCard>(schema);
  for (let i = 0; i < cardEntries.length; i++) {
    const [name, definition] = at(cardEntries, i);
    const groups = [];
    const descriptors: FormattingDescriptor[] = [];
    const groupEntries = Object.entries(definition.settingsGroups);
    const values = settingsValues[name];
    if (values === undefined) {
      throw new Error(`Missing settings for ${name}`);
    }
    for (let j = 0; j < groupEntries.length; j++) {
      const [groupName, definitions] = at(groupEntries, j);
      const settingEntries = Object.entries(definitions);
      const slices = [];
      for (let k = 0; k < settingEntries.length; k++) {
        const [settingName, setting] = at(settingEntries, k);
        descriptors.push({ objectName: name, propertyName: settingName });
        const descriptor: FormattingDescriptor = { objectName: name, propertyName: settingName };
        descriptor.selector = { data: [{ dataViewWildcard: { matchingOption: 0 } }] };
        if (setting.type !== FormattingComponent.ToggleSwitch) {
          descriptor.instanceKind = 3;
        }
        const value = values[settingName];
        const control: FormattingControl = { type: setting.type, properties: { descriptor, value } };
        if (setting.type === FormattingComponent.ColorPicker) {
          if (typeof value !== "string") {
            throw new Error(`Missing colour for ${name}.${settingName}`);
          }
          control.properties.value = { value };
        } else if (setting.type === FormattingComponent.Dropdown && setting.items !== undefined) {
          control.properties.items = setting.items;
          control.properties.value = undefined;
          for (let l = 0; l < setting.items.length; l++) {
            const item = at(setting.items, l);
            if (item.value === value) {
              control.properties.value = item;
              break;
            }
          }
        }
        if (setting.options !== undefined) {
          control.properties.options = setting.options;
        }
        slices.push({
          uid: name + "_" + groupName + "_" + settingName + "_slice_uid",
          displayName: setting.displayName,
          infoIconText: setting.description,
          control
        });
      }
      groups.push({
        displayName: groupDisplayName(definition, groupName),
        uid: name + "_" + groupName + "_uid",
        slices
      });
    }
    cards.push({
      description: definition.description,
      displayName: definition.displayName,
      uid: name + "_card_uid",
      groups,
      revertToDefaultDescriptors: descriptors
    });
  }
  return { cards };
}
