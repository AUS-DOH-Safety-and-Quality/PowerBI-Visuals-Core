import type powerbi from "powerbi-visuals-api";
import { frontendChart, type FrontendVisual } from "./charts";
import { svgTooltipService, type TooltipSettings } from "./tooltip";

type IVisualHost = powerbi.extensibility.visual.IVisualHost;
type VisualConstructorOptions = powerbi.extensibility.visual.VisualConstructorOptions;

/** A row's identity is its frontend keys; grouped rows carry every row's keys */
export type FrontendSelectionId = { readonly keys: readonly string[]; getKey(): string };

export function selectionId(keys: readonly string[]): FrontendSelectionId {
  return { keys, getKey: () => JSON.stringify(keys) };
}

/** The selection calls the visuals make; every identity they pass back was built by the frontend */
export type FrontendSelectionManager = {
  /** Frontends update the highlighting themselves when their selection changes */
  registerOnSelectCallback(): void;
  getSelectionIds(): FrontendSelectionId[];
  select(identity: FrontendSelectionId | FrontendSelectionId[], multiSelect?: boolean): Promise<void>;
  clear(): Promise<void>;
  showContextMenu(): Promise<void>;
};

/** Selection calls that do nothing, for hosts without linked selection */
export const noSelection: FrontendSelectionManager = {
  registerOnSelectCallback: () => {},
  getSelectionIds: () => [],
  select: () => Promise.resolve(),
  clear: () => Promise.resolve(),
  showContextMenu: () => Promise.resolve()
};

export type FrontendServices = {
  readonly selectionManager: FrontendSelectionManager;
  /** Read on each tooltip; undefined shows none */
  readonly tooltipSettings: () => TooltipSettings | undefined;
  /** The keys of the data view's row */
  rowKeys(index: number): readonly string[];
  readonly displayWarningIcon: (hoverText: string, detailedText: string) => void;
};

function ignore(): void {}

function constructorOptions(element: HTMLElement, services: FrontendServices,
                            tooltipService: Pick<powerbi.extensibility.ITooltipService, "show" | "hide">): VisualConstructorOptions {
  const host = {
    createSelectionManager: () => services.selectionManager,
    createSelectionIdBuilder: () => {
      let keys: readonly string[] = [];
      const builder = {
        withCategory: (_category: powerbi.DataViewCategoryColumn, index: number) => {
          keys = services.rowKeys(index);
          return builder;
        },
        createSelectionId: () => selectionId(keys)
      };
      return builder;
    },
    tooltipService,
    eventService: {
      renderingStarted: ignore,
      renderingFailed: ignore,
      renderingFinished: ignore
    },
    colorPalette: {
      isHighContrast: false,
      foreground: { value: "black" },
      background: { value: "white" },
      foregroundSelected: { value: "black" },
      hyperlink: { value: "blue" }
    },
    hostCapabilities: {
      allowInteractions: true
    },
    displayWarningIcon: services.displayWarningIcon
  };
  // Outside Power BI there is no host; this implements the members the visuals call
  return { element, host: host as unknown as IVisualHost };
}

/** A registered chart's visual drawn in element, with tooltips in its own SVG */
export function createVisual(chartType: string, element: HTMLElement, services: FrontendServices): FrontendVisual {
  const visual: FrontendVisual = new (frontendChart(chartType).Visual)(constructorOptions(element, services, svgTooltipService(() => visual.svg, services.tooltipSettings)));
  return visual;
}
