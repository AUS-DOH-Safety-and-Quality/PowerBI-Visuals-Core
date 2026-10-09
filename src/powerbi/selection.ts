import type powerbi from "powerbi-visuals-api";

/** Anything with a Power BI selection key; ISelectionId satisfies it without importing the API */
export type SelectionKeyed = { getKey(): string };

/** Keys of the host's current selection, taken once per highlighting pass */
export function selectedKeys(selected: readonly SelectionKeyed[]): Set<string> {
  const keys = new Set<string>();
  for (let i = 0; i < selected.length; i++) {
    keys.add(selected[i].getKey());
  }
  return keys;
}

/** Key equality: rebuilt identities with the same key stay selected */
export function identitySelected(identity: SelectionKeyed | readonly SelectionKeyed[], selected: ReadonlySet<string>): boolean {
  if ("getKey" in identity) {
    return selected.has(identity.getKey());
  }
  for (let i = 0; i < identity.length; i++) {
    if (selected.has(identity[i].getKey())) {
      return true;
    }
  }
  return false;
}

export type SelectionState = {
  readonly active: boolean;
  readonly selected: ReadonlySet<string>;
};

/** Active while the host highlights rows or anything is selected; the manager's ids are keyed at runtime */
export function selectionState(manager: powerbi.extensibility.ISelectionManager, anyHighlights: boolean): SelectionState {
  const ids = manager.getSelectionIds() as powerbi.visuals.ISelectionId[];
  return { active: anyHighlights || ids.length > 0, selected: selectedKeys(ids) };
}
