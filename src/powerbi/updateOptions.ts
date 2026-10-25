import at from "../util/at";
import type powerbi from "powerbi-visuals-api";

/** Tests pass the flags that skip rendering work; the host never sets them */
export type UpdateOptions = powerbi.extensibility.visual.VisualUpdateOptions & { headless?: boolean; frontend?: boolean };

/* eslint-disable @typescript-eslint/no-unsafe-enum-assignment -- the api's const enum has no runtime values to share */
/** VisualUpdateType's values; the api declares an ambient const enum, which isolated transpilation cannot inline */
export const updateType = {
  data: 2 as powerbi.VisualUpdateType.Data,
  resize: 4 as powerbi.VisualUpdateType.Resize,
  viewMode: 8 as powerbi.VisualUpdateType.ViewMode,
  style: 16 as powerbi.VisualUpdateType.Style,
  resizeEnd: 32 as powerbi.VisualUpdateType.ResizeEnd,
  all: 62 as powerbi.VisualUpdateType.All
} as const;

/** Hosts send combinations of the flags, which the enum cannot name */
export function combineUpdateTypes(types: readonly powerbi.VisualUpdateType[]): powerbi.VisualUpdateType {
  let combined = 0;
  for (let i = 0; i < types.length; i++) {
    combined |= at(types, i);
  }
  return combined;
}
/* eslint-enable @typescript-eslint/no-unsafe-enum-assignment */
