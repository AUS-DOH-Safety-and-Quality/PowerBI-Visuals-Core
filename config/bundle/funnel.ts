import { registerChart } from "powerbi-visuals-core/frontends";
import { frontend } from "powerbi-funnels/src/frontend";

registerChart("funnel", frontend);

export { defaultSettings } from "powerbi-funnels/src/settings";
export { Visual } from "powerbi-funnels/src/visual";
