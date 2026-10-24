import type powerbi from "powerbi-visuals-api";
import { updateType } from "../powerbi";
import { SVG_NS } from "../rendering";
import {
  asArray, chartPngBlob, chartSvgBlob, constructorOptions, frontendChart, makeUpdateValues, paddedDataViews, selectionId, toDataViews,
  updateChartTitle, type Aggregations, type Column, type FrontendDataView, type FrontendSelectionId, type FrontendSelectionManager,
  svgTooltipService, type FrontendVisual, type InputSettings, type RawData, type TitleSettings, type TooltipSettings
} from ".";

type CrosstalkHandle = {
  setGroup(group: string | null): void;
  on(event: "change", listener: (event: { readonly value: string[] | null }) => void): string;
};
/** The group's combined filter, null when no filter is active */
type CrosstalkFilterHandle = CrosstalkHandle & { readonly filteredKeys: string[] | null };
type CrosstalkSelectionHandle = CrosstalkHandle & { readonly value: string[] | null; set(keys: string[]): void; clear(): void };
declare const crosstalk: { FilterHandle: new () => CrosstalkFilterHandle; SelectionHandle: new () => CrosstalkSelectionHandle };

/** R unboxes length-one vectors when serialising the widget data */
type WidgetUpdateValues = {
  readonly dataViews: readonly FrontendDataView[];
  readonly crosstalk_identities: readonly Column[];
};

/** Crosstalk data is aggregated here so that filtering can re-aggregate it; other data arrives aggregated */
export type WidgetData = {
  readonly title_settings: TitleSettings;
  readonly crosstalk_group: string | null;
  readonly tooltip_settings: TooltipSettings;
} & ({
  readonly is_crosstalk: true;
  readonly data_raw: RawData;
  readonly input_settings: InputSettings;
  readonly aggregations: Aggregations;
} | {
  readonly is_crosstalk: false;
  readonly update_values: WidgetUpdateValues;
});

export type Widget = {
  renderValue(x: WidgetData): void;
  resize(width: number, height: number): void;
  /** Pages retitle the chart through htmlwidgets' instance; undefined restores the rendered title */
  setTitle(text: string | undefined): void;
};

function keysOf(column: Column): string[] {
  const values = asArray(column);
  const keys = new Array<string>(values.length);
  for (let i = 0; i < values.length; i++) {
    keys[i] = String(values[i]);
  }
  return keys;
}

/** An htmlwidgets factory drawing the chart, with Crosstalk standing in for Power BI's selection and filtering */
export function makeFactory(chartType: string): (el: HTMLElement, width: number, height: number) => Widget {
  return (el, width, height) => {
    const filterHandle = new crosstalk.FilterHandle();
    const selectionHandle = new crosstalk.SelectionHandle();
    const viewport = { width, height };
    let x: WidgetData | undefined;
    let titleText: string | undefined;
    let updateValues: WidgetUpdateValues = { dataViews: [], crosstalk_identities: [] };
    let dataViews: FrontendDataView[] = [];

    const selectionManager: FrontendSelectionManager = {
      registerOnSelectCallback: () => {},
      getSelectionIds: () => {
        const selectedKeys = selectionHandle.value ?? [];
        const selected = new Set(selectedKeys);
        const groups = updateValues.crosstalk_identities;
        const identities = new Array<FrontendSelectionId>(selectedKeys.length);
        for (let i = 0; i < selectedKeys.length; i++) {
          identities[i] = selectionId([selectedKeys[i]]);
        }
        for (let i = 0; i < groups.length; i++) {
          const keys = keysOf(groups[i]);
          for (let j = 0; j < keys.length; j++) {
            if (selected.has(keys[j])) {
              identities.push(selectionId(keys));
              break;
            }
          }
        }
        return identities;
      },
      // As in Power BI, multi-select toggles each identity, here selected when any of its keys are, as getSelectionIds has it
      select: (identity, multiSelect) => {
        const identities = Array.isArray(identity) ? identity : [identity];
        const selected = new Set(multiSelect === true ? selectionHandle.value ?? [] : []);
        for (let i = 0; i < identities.length; i++) {
          const keys = identities[i].keys;
          let anySelected = false;
          for (let j = 0; j < keys.length && !anySelected; j++) {
            anySelected = selected.has(keys[j]);
          }
          for (let j = 0; j < keys.length; j++) {
            if (anySelected) {
              selected.delete(keys[j]);
            } else {
              selected.add(keys[j]);
            }
          }
        }
        // Crosstalk reads an empty selection as one that excludes every row
        if (selected.size === 0) {
          selectionHandle.clear();
        } else {
          selectionHandle.set(Array.from(selected));
        }
        return Promise.resolve();
      },
      clear: () => {
        selectionHandle.clear();
        return Promise.resolve();
      },
      showContextMenu: () => Promise.resolve()
    };

    const visual: FrontendVisual = new (frontendChart(chartType).Visual)(constructorOptions(el, {
      selectionManager,
      tooltipService: svgTooltipService(() => visual.svg, () => x?.tooltip_settings),
      rowKeys: index => keysOf(updateValues.crosstalk_identities[index]),
      displayWarningIcon: (hoverText, detailedText) => {
        console.log(hoverText, detailedText);
      }
    }));
    const svg = visual.svg.node();
    if (svg === null) {
      throw new Error("The visual has no SVG.");
    }
    addExportControl(el, svg, chartType);

    /** The widget's title settings, with any title set since */
    function titleSettings(data: WidgetData): TitleSettings {
      return titleText === undefined ? data.title_settings : { ...data.title_settings, text: titleText };
    }

    function updateVisual(type: powerbi.VisualUpdateType): void {
      visual.update({ dataViews: toDataViews(dataViews), viewport, type });
      if (x !== undefined) {
        updateChartTitle(visual.svg, titleSettings(x));
      }
    }

    /** Aggregates the rows within the group's active filter, if any */
    function redraw(data: WidgetData): void {
      updateValues = data.is_crosstalk
        ? makeUpdateValues(data.data_raw, data.input_settings, data.aggregations, filterHandle.filteredKeys ?? undefined)
        : data.update_values;
      dataViews = paddedDataViews(chartType, updateValues.dataViews, titleSettings(data), false);
      updateVisual(updateType.data);
    }

    // The visual's selection functions already map identities to Crosstalk keys
    selectionHandle.on("change", () => {
      visual.updateHighlighting();
    });
    // Filtering re-aggregates the remaining rows
    filterHandle.on("change", () => {
      if (x?.is_crosstalk === true) {
        redraw(x);
      }
    });

    return {
      renderValue: value => {
        x = value;
        selectionHandle.setGroup(value.crosstalk_group);
        filterHandle.setGroup(value.crosstalk_group);
        redraw(value);
      },
      resize: (newWidth, newHeight) => {
        viewport.width = newWidth;
        viewport.height = newHeight;
        updateVisual(updateType.resize);
      },
      // The plot is padded again, as the title may be added or removed
      setTitle: text => {
        titleText = text;
        if (x !== undefined) {
          redraw(x);
        }
      }
    };
  };
}

function fileName(svg: SVGSVGElement, chartType: string): string {
  const title = svg.querySelector(".chart-title")?.textContent || chartType;
  // eslint-disable-next-line no-control-regex -- file names cannot contain control characters
  const name = title.replace(/[<>:"/\\|?*\u0000-\u001f]/g, "-").trim().replace(/[. ]+$/, "");
  return name === "" ? chartType : name;
}

function svgElement<K extends keyof SVGElementTagNameMap>(name: K, attributes: Readonly<Record<string, string>>): SVGElementTagNameMap[K] {
  const element = document.createElementNS(SVG_NS, name);
  const names = Object.keys(attributes);
  for (let i = 0; i < names.length; i++) {
    element.setAttribute(names[i], attributes[names[i]]);
  }
  return element;
}

function exportIcon(): SVGSVGElement {
  const icon = svgElement("svg", {
    "width": "16",
    "height": "16",
    "viewBox": "0 0 24 24",
    "fill": "none",
    "stroke": "currentColor",
    "stroke-width": "1.6",
    "aria-hidden": "true"
  });
  icon.appendChild(svgElement("path", {
    "d": "M12 3v12m-4-4 4 4 4-4M5 16v5h14v-5",
    "stroke-linecap": "round",
    "stroke-linejoin": "round"
  }));
  return icon;
}

function addExportControl(el: HTMLElement, svg: SVGSVGElement, chartType: string): void {
  el.classList.add("controlcharts-widget");
  const control = document.createElement("details");
  control.className = "controlcharts-export";
  const summary = document.createElement("summary");
  summary.setAttribute("aria-label", "Export chart");
  summary.title = "Export chart";
  summary.appendChild(exportIcon());
  const options = document.createElement("div");
  options.className = "controlcharts-export-options";
  options.setAttribute("role", "group");
  options.setAttribute("aria-label", "Export image");
  const formats = ["svg", "png"];
  const buttons = new Array<HTMLButtonElement>(formats.length);
  for (let i = 0; i < formats.length; i++) {
    buttons[i] = document.createElement("button");
    buttons[i].type = "button";
    buttons[i].dataset.format = formats[i];
    buttons[i].textContent = formats[i].toUpperCase();
  }
  const status = document.createElement("span");
  status.className = "controlcharts-export-status";
  status.setAttribute("role", "status");
  options.append(...buttons, status);
  control.append(summary, options);
  el.appendChild(control);

  function setBusy(busy: boolean): void {
    for (let i = 0; i < buttons.length; i++) {
      buttons[i].disabled = busy;
    }
    if (busy) {
      control.setAttribute("aria-busy", "true");
    } else {
      control.removeAttribute("aria-busy");
    }
  }

  async function exportChart(format: string): Promise<void> {
    status.textContent = "";
    setBusy(true);
    try {
      const blob = format === "png" ? await chartPngBlob(svg) : chartSvgBlob(svg);
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `${fileName(svg, chartType)}.${format}`;
      document.body.appendChild(link);
      link.click();
      link.remove();
      setTimeout(() => {
        URL.revokeObjectURL(url);
      }, 1000);
      control.open = false;
      summary.focus();
    } catch {
      status.textContent = "Could not export image. Please try again.";
    } finally {
      setBusy(false);
    }
  }

  control.addEventListener("click", event => {
    event.stopPropagation();
  });
  control.addEventListener("keydown", event => {
    if (event.key === "Escape") {
      control.open = false;
      summary.focus();
      event.stopPropagation();
    }
  });
  control.addEventListener("focusout", event => {
    if (!(event.relatedTarget instanceof Node && control.contains(event.relatedTarget))) {
      control.open = false;
    }
  });
  for (let i = 0; i < buttons.length; i++) {
    const format = formats[i];
    buttons[i].addEventListener("click", () => {
      void exportChart(format);
    });
  }
}
