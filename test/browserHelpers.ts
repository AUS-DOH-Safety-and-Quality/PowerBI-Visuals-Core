import { vi } from "vitest";
import type powerbi from "powerbi-visuals-api";
import { testDom } from "powerbi-visuals-utils-testutils";
import { keyedHost } from "../src/testing/index";
import { createAxisCard, createCanvasCard, createDefaultValues, createDownloadCard, createLabelsCard, defineCard, dotOptions } from "../src/settings/index";
import { createPlotFrame, initialiseSvg, type PlotContext, type PlotFrame } from "../src/rendering/index";

export const settings = createDefaultValues({
  canvas: createCanvasCard(),
  x_axis: createAxisCard("x", { tickRotation: 0, limitUnits: "a value" }),
  y_axis: createAxisCard("y", { tickRotation: 0, limitUnits: "a value" }),
  labels: createLabelsCard(),
  download_options: createDownloadCard(),
  scatter: defineCard({ displayName: "Scatter", description: "", settingsGroups: { all: dotOptions() } })
});
export const palette = { isHighContrast: false, foregroundColour: "#ffffff" };

export function svgElement(width = 500, height = 400): SVGSVGElement {
  const element = testDom(String(height), String(width));
  const svg = element.ownerDocument.createElementNS("http://www.w3.org/2000/svg", "svg");
  svg.setAttribute("width", String(width));
  svg.setAttribute("height", String(height));
  element.appendChild(svg);
  initialiseSvg(svg);
  return svg;
}

export function frame(overrides: Partial<Parameters<typeof createPlotFrame>[0]> = {}): PlotFrame {
  return createPlotFrame({
    width: 500,
    height: 400,
    displayPlot: true,
    x: { lower: 0, upper: 10 },
    y: { lower: 0, upper: 100 },
    settings,
    palette,
    ...overrides
  });
}

export type TestPoint = {
  x: number;
  value: number;
  aesthetics: typeof settings.scatter;
  identity: powerbi.visuals.ISelectionId;
  tooltip: powerbi.extensibility.VisualTooltipDataItem[];
  highlighted: boolean;
  label: {
    text_value: string | undefined;
    aesthetics: typeof settings.labels;
    angle: number | undefined;
    distance: number | undefined;
  };
};

export function host(): powerbi.extensibility.visual.IVisualHost {
  const result = keyedHost();
  // The mock host exposes these as getters, so they are redefined rather than assigned
  Object.defineProperty(result, "tooltipService", {
    value: {
      show: vi.fn(),
      hide: vi.fn(),
      move: vi.fn(),
      enabled: () => true
    },
    configurable: true
  });
  Object.defineProperty(result, "downloadService", {
    value: {
      exportVisualsContent: vi.fn(() => Promise.resolve(true)),
      exportVisualsContentExtended: vi.fn(() => Promise.resolve({ downloadCompleted: true }))
    },
    configurable: true
  });
  Object.defineProperty(result, "hostCapabilities", {
    value: { allowInteractions: true },
    configurable: true,
    writable: true
  });
  return result;
}

const column = { source: { displayName: "key" }, values: ["A", "B", "C", "D"] } as never;

export function points(visualHost: powerbi.extensibility.visual.IVisualHost, values: readonly number[], labels: readonly (string | undefined)[] = []): TestPoint[] {
  const result = new Array<TestPoint>(values.length);
  for (let i = 0; i < values.length; i++) {
    result[i] = {
      x: i,
      value: values[i],
      aesthetics: { ...settings.scatter },
      highlighted: false,
      identity: visualHost.createSelectionIdBuilder().withCategory(column, i).createSelectionId(),
      tooltip: [{ displayName: "Value", value: String(values[i]) }],
      label: {
        text_value: labels[i],
        aesthetics: { ...settings.labels },
        angle: undefined,
        distance: undefined
      }
    };
  }
  return result;
}

export function context(visualHost: powerbi.extensibility.visual.IVisualHost, plotPoints: readonly TestPoint[], overrides: Partial<PlotContext<TestPoint>> = {}): PlotContext<TestPoint> {
  return {
    frame: frame(),
    points: plotPoints,
    palette,
    settings,
    host: visualHost,
    selectionManager: visualHost.createSelectionManager(),
    onSelectionChange: vi.fn(),
    headless: false,
    frontend: true,
    ...overrides
  };
}

/** Client coordinates of a point in the svg's user space, for synthetic mouse events */
export function client(svg: SVGSVGElement, x: number, y: number): { clientX: number; clientY: number } {
  const rect = svg.getBoundingClientRect();
  return { clientX: rect.left + x, clientY: rect.top + y };
}

export function pluck<T, K extends keyof T>(items: ArrayLike<T>, key: K): T[K][] {
  const result = new Array<T[K]>(items.length);
  for (let i = 0; i < items.length; i++) {
    result[i] = items[i][key];
  }
  return result;
}
