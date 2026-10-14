import type powerbi from "powerbi-visuals-api";

type IVisualHost = powerbi.extensibility.visual.IVisualHost;
type VisualConstructorOptions = powerbi.extensibility.visual.VisualConstructorOptions;
type ITooltipService = powerbi.extensibility.ITooltipService;

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

export type FrontendServices = {
  readonly selectionManager: FrontendSelectionManager;
  readonly tooltipService: Pick<ITooltipService, "show" | "hide">;
  /** The keys of the category's row */
  rowKeys(category: powerbi.DataViewCategoryColumn, index: number): readonly string[];
};

function ignore(): void {}

export function constructorOptions(element: HTMLElement, services: FrontendServices): VisualConstructorOptions {
  const host = {
    createSelectionManager: () => services.selectionManager,
    createSelectionIdBuilder: () => {
      let keys: readonly string[] = [];
      const builder = {
        withCategory: (category: powerbi.DataViewCategoryColumn, index: number) => {
          keys = services.rowKeys(category, index);
          return builder;
        },
        createSelectionId: () => selectionId(keys)
      };
      return builder;
    },
    tooltipService: services.tooltipService,
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
    displayWarningIcon: (hoverText: string, detailedText: string) => {
      console.log(hoverText, detailedText);
    }
  };
  // Outside Power BI there is no host; this implements the members the visuals call
  return { element, host: host as unknown as IVisualHost };
}
