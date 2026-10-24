import { registerChart } from "powerbi-visuals-core/frontends";
import { frontend } from "powerbi-spc/src/frontend";

registerChart("spc", frontend);

export { defaultSettings } from "powerbi-spc/src/settings";
export { Visual } from "powerbi-spc/src/visual";
