import type powerbi from "powerbi-visuals-api";

/** Tests pass the flags that skip rendering work; the host never sets them */
export type UpdateOptions = powerbi.extensibility.visual.VisualUpdateOptions & { headless?: boolean; frontend?: boolean };
