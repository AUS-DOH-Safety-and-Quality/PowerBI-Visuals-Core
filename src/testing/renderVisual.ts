import type powerbi from "powerbi-visuals-api";
import { onTestFinished } from "vitest";
import { testDom, createVisualHost } from "powerbi-visuals-utils-testutils";
import { updateType, type UpdateOptions } from "../powerbi/updateOptions";

type IVisualHost = powerbi.extensibility.visual.IVisualHost;
type VisualConstructorOptions = powerbi.extensibility.visual.VisualConstructorOptions;

export type RenderOptions = {
  host?: IVisualHost;
  /** Adjusts each data view before the update, e.g. highlights */
  prepare?: (dataView: powerbi.DataView) => void;
};

export type Rendered<V, S, I> = {
  element: HTMLElement;
  visual: V;
  update: (settings: S, inputs?: I) => void;
};

export type Renderer<V, S, I> = (settings: S, inputs: I, options?: RenderOptions) => Rendered<V, S, I>;

/**
 * Renders a 500px visual from settings and inputs, removed when the test finishes;
 * later updates reuse the inputs unless given new ones
 */
export default function createRenderer<V extends { update(options: UpdateOptions): void }, S, I>(
  Visual: new (options: VisualConstructorOptions) => V,
  build: (inputs: I, settings: S) => powerbi.DataView
): Renderer<V, S, I> {
  return (settings, inputs, options = {}) => {
    const element = testDom("500", "500");
    onTestFinished(() => element.remove());
    const visual = new Visual({ element, host: options.host ?? createVisualHost({}) });
    let current = inputs;
    const update = (next: S, nextInputs = current): void => {
      current = nextInputs;
      const dataView = build(nextInputs, next);
      options.prepare?.(dataView);
      visual.update({ dataViews: [dataView], viewport: { width: 500, height: 500 }, type: updateType.data });
    };
    update(settings);
    return { element, visual, update };
  };
}
