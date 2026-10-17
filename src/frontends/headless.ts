import { updateType, type UpdateOptions } from "../powerbi";
import { SVG_NS } from "../rendering";
import {
  asArray, chartAggregations, chartNames, chartSettings, chartTitle, constructorOptions, frontendChart, makeUpdateValues,
  paddedDataViews, toDataViews, updateChartTitle, type FrontendDataView, type FrontendServices, type FrontendVisual, type RawData,
  type TitleSettings
} from ".";

export type HeadlessResult = { readonly error: string } | Readonly<Record<string, unknown>>;

/** Each registered chart's visual, drawn into the headless document */
export const visuals: Record<string, FrontendVisual> = {};

const services: FrontendServices = {
  selectionManager: {
    registerOnSelectCallback: () => {},
    getSelectionIds: () => [],
    select: () => Promise.resolve(),
    clear: () => Promise.resolve(),
    showContextMenu: () => Promise.resolve()
  },
  tooltipService: {
    show: () => {},
    hide: () => {}
  },
  rowKeys: (_category, index) => [String(index)]
};

/** The headless document stands in for the browser's */
export function initialiseHeadless(dom: { readonly document: Document; readonly window: Window & typeof globalThis }): void {
  globalThis.document = dom.document;
  globalThis.window = dom.window;
  const names = chartNames();
  for (let i = 0; i < names.length; i++) {
    const container = dom.document.createElement("div");
    container.classList.add(`${names[i]}-container`);
    dom.document.body.appendChild(container);
    visuals[names[i]] = new (frontendChart(names[i]).Visual)(constructorOptions(container, services));
  }
}

function updateOptions(dataViews: readonly FrontendDataView[], width: number, height: number): UpdateOptions {
  return {
    dataViews: toDataViews(dataViews),
    viewport: { width, height },
    type: updateType.data,
    headless: true,
    frontend: true
  };
}

/** Word's SVG renderer ignores dominant-baseline, so position text with dy instead */
function svgDocument(content: string, width: number, height: number): string {
  const body = content
    .split('dominant-baseline="hanging"').join('dy="0.8em"')
    .split('dominant-baseline="middle"').join('dy="0.35em"');
  return `<svg viewBox="0 0 ${width} ${height}" width="${width}px" height="${height}px" xmlns="${SVG_NS}">`
    + '<rect x="0" y="0" width="100%" height="100%" fill="white"/>'
    + body
    + "</svg>";
}

export function updateHeadlessVisual(chartType: string, dataViews: readonly FrontendDataView[], titleSettings: TitleSettings,
                                     width: number, height: number, staticPlot: boolean, limits: boolean): HeadlessResult {
  const chart = frontendChart(chartType);
  const visual = visuals[chartType];
  // Clear the previous view
  visual.update(updateOptions([], width, height));

  let result: Record<string, unknown> = {};
  if (staticPlot) {
    visual.update(updateOptions(paddedDataViews(chartType, dataViews, titleSettings, true), width, height));
    updateChartTitle(visual.svg, titleSettings);
    const errorMessage = visual.svg.select(".errormessage");
    if (errorMessage.size() > 0) {
      return { error: errorMessage.text() };
    }
    const staticError = chart.staticError?.(visual);
    if (staticError !== undefined) {
      return { error: staticError };
    }
    const svg = visual.svg.node();
    if (svg === null) {
      throw new Error("The visual has no SVG.");
    }
    result.svg = svgDocument(svg.innerHTML, width, height);
  } else {
    const status = visual.viewModel.update(updateOptions(dataViews, width, height), visual.host);
    if (!status.status) {
      return { error: status.error };
    }
  }
  if (limits) {
    result = { ...result, ...chart.limits(visual) };
  }
  return result;
}

/** Validates and processes raw inputs, then renders, for frontends without interactive plots */
export function headlessChart(chartType: string, rawData: RawData, inputSettings: Readonly<Record<string, unknown>>, aggregations: unknown,
                              title: unknown, width: number, height: number, staticPlot: boolean, limits: boolean): HeadlessResult {
  const settings = chartSettings(chartType, inputSettings, asArray(rawData.categories).length);
  if ("error" in settings) {
    return settings;
  }
  const chartAggs = chartAggregations(aggregations);
  if ("error" in chartAggs) {
    return chartAggs;
  }
  const titleSettings = chartTitle(title);
  if ("error" in titleSettings) {
    return titleSettings;
  }
  const updateValues = makeUpdateValues(rawData, settings.settings, chartAggs.aggregations);
  const result = updateHeadlessVisual(chartType, updateValues.dataViews, titleSettings.settings, width, height, staticPlot, limits);
  // Frontends map limit rowIds to the input rows that contributed to them
  if (!limits || "error" in result) {
    return result;
  }
  return { ...result, source_rows: updateValues.source_rows };
}
