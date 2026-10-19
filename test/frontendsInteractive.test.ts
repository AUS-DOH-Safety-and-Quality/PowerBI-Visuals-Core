import type powerbi from "powerbi-visuals-api";
import { describe, expect, it, vi } from "vitest";
import { makeUpdateValues, selectionId } from "../src/frontends/index";
import { makeFactory, type WidgetData } from "../src/frontends/interactive";
import { identitySelected, selectionState, updateType } from "../src/powerbi/index";
import { must } from "../src/testing/index";
import { defaultAggregations, TestVisual, titleSettings } from "./frontendHelpers";

type Listener = (event: { readonly value: string[] | null }) => void;

/** Crosstalk's handles, keeping the keys and listeners in memory */
class FakeHandle {
  static readonly instances: FakeHandle[] = [];
  keys: string[] | null = null;
  readonly listeners: Listener[] = [];
  constructor() {
    FakeHandle.instances.push(this);
  }
  setGroup(): void {}
  on(_event: "change", listener: Listener): string {
    this.listeners.push(listener);
    return String(this.listeners.length);
  }
  set(keys: string[] | null): void {
    this.keys = keys;
    for (let i = 0; i < this.listeners.length; i++) {
      this.listeners[i]({ value: keys });
    }
  }
  clear(): void {
    this.set(null);
  }
}

/** A filter handle reads the group's filter as `filteredKeys`, a selection handle its selection as `value` */
class FakeFilterHandle extends FakeHandle {
  get filteredKeys(): string[] | null {
    return this.keys;
  }
}
class FakeSelectionHandle extends FakeHandle {
  get value(): string[] | null {
    return this.keys;
  }
}
Object.assign(globalThis, { crosstalk: { FilterHandle: FakeFilterHandle, SelectionHandle: FakeSelectionHandle } });

const widgetData: WidgetData = {
  title_settings: titleSettings(null),
  crosstalk_group: "group",
  tooltip_settings: {
    ttip_font_size: 12,
    ttip_font: "Arial",
    ttip_font_color: "black",
    ttip_background_color: "white",
    ttip_opacity: 1,
    ttip_border_radius: 2,
    ttip_border_color: "grey",
    ttip_border_width: 1
  },
  is_crosstalk: true,
  data_raw: { categories: ["a", "b", "a"], category_name: "key", numerators: [1, 2, 3], crosstalk_identities: ["r1", "r2", "r3"] },
  input_settings: {},
  aggregations: defaultAggregations
};

/** The widget, its element, visual, and its filter and selection handles, which the factory creates in that order */
function renderWidget(filtered: string[] | null = null, data: WidgetData = widgetData) {
  const handles = FakeHandle.instances.length;
  const el = document.body.appendChild(document.createElement("div"));
  const widget = makeFactory("test")(el, 300, 200);
  const filter = must(FakeHandle.instances[handles]);
  filter.keys = filtered;
  widget.renderValue(data);
  const visual = must(TestVisual.instances[TestVisual.instances.length - 1]);
  return { widget, el, visual, filter, selection: must(FakeHandle.instances[handles + 1]) };
}

/** The manager's selected identities as the visuals read them, by key */
function keysOf(selectionManager: powerbi.extensibility.ISelectionManager): string[] {
  return Array.from(selectionState(selectionManager, false).selected);
}

function keyedBy(...keys: (readonly string[])[]): string[] {
  const result = new Array<string>(keys.length);
  for (let i = 0; i < keys.length; i++) {
    result[i] = selectionId(keys[i]).getKey();
  }
  return result;
}

/** The last drawn categories and their numerators */
function drawn(visual: TestVisual): { categories: unknown[]; numerators: unknown[] } {
  const categorical = must(visual.updates[visual.updates.length - 1].dataViews?.[0].categorical);
  return { categories: must(categorical.categories?.[0]).values, numerators: must(categorical.values?.[0]).values };
}

describe("interactive widgets", () => {
  it("recalculates when redrawn after a resize, without registering Crosstalk listeners again", () => {
    const { widget, visual, filter, selection } = renderWidget();
    widget.resize(400, 250);
    expect(must(visual.updates[visual.updates.length - 1]).type).toBe(updateType.resize);
    widget.renderValue(widgetData);
    expect(must(visual.updates[visual.updates.length - 1]).type).toBe(updateType.data);
    expect([filter.listeners.length, selection.listeners.length]).toEqual([1, 1]);
  });

  it("adds to the Crosstalk selection on multi-select, and clears it", async () => {
    const { visual, selection } = renderWidget();
    const category = must(visual.updates[visual.updates.length - 1].dataViews?.[0].categorical?.categories?.[0]);
    const selectionManager = visual.host.createSelectionManager();
    await selectionManager.select(visual.host.createSelectionIdBuilder().withCategory(category, 0).createSelectionId());
    await selectionManager.select(visual.host.createSelectionIdBuilder().withCategory(category, 1).createSelectionId(), true);
    expect([...must(selection.keys)].sort()).toEqual(["r1", "r2", "r3"]);
    await selectionManager.clear();
    expect(selection.keys).toBeNull();
  });

  it("toggles an identity on multi-select, without repeating keys, and clears once nothing is selected", async () => {
    const { visual, selection } = renderWidget();
    const category = must(visual.updates[visual.updates.length - 1].dataViews?.[0].categorical?.categories?.[0]);
    const selectionManager = visual.host.createSelectionManager();
    const a = visual.host.createSelectionIdBuilder().withCategory(category, 0).createSelectionId();
    const b = visual.host.createSelectionIdBuilder().withCategory(category, 1).createSelectionId();
    await selectionManager.select(a);
    await selectionManager.select(a);
    expect(selection.keys).toEqual(["r1", "r3"]);
    await selectionManager.select(b, true);
    await selectionManager.select(a, true);
    expect(selection.keys).toEqual(["r2"]);
    await selectionManager.select(b, true);
    expect(selection.keys).toBeNull();
    await selectionManager.select(b);
    expect(selection.keys).toEqual(["r2"]);
  });

  it("deselects an identity shown as selected through only some of its keys", async () => {
    const { visual, selection } = renderWidget();
    const category = must(visual.updates[visual.updates.length - 1].dataViews?.[0].categorical?.categories?.[0]);
    const selectionManager = visual.host.createSelectionManager();
    const a = visual.host.createSelectionIdBuilder().withCategory(category, 0).createSelectionId();
    const b = visual.host.createSelectionIdBuilder().withCategory(category, 1).createSelectionId();
    const shown = (identity: typeof a) => identitySelected(identity, selectionState(selectionManager, false).selected);
    // Another widget selected only one of a's rows
    selection.set(["r3", "r2"]);
    expect([shown(a), shown(b)]).toEqual([true, true]);
    await selectionManager.select(a, true);
    expect([shown(a), shown(b)]).toEqual([false, true]);
    expect(selection.keys).toEqual(["r2"]);
    selection.set(["r3"]);
    await selectionManager.select([a, b], true);
    expect([shown(a), shown(b)]).toEqual([false, true]);
    expect(selection.keys).toEqual(["r2"]);
  });

  it("aggregates only the filtered rows when rendered while a Crosstalk filter is active", () => {
    const unfiltered = renderWidget();
    expect(drawn(unfiltered.visual)).toEqual({ categories: ["a", "b"], numerators: [4, 2] });
    unfiltered.filter.set(["r1", "r2"]);
    expect(drawn(unfiltered.visual)).toEqual({ categories: ["a", "b"], numerators: [1, 2] });
    unfiltered.widget.renderValue(widgetData);
    expect(drawn(unfiltered.visual)).toEqual({ categories: ["a", "b"], numerators: [1, 2] });
    const filtered = renderWidget(["r3"]);
    expect(drawn(filtered.visual)).toEqual({ categories: ["a"], numerators: [3] });
  });

  it("keeps a page's title through resizes and filtering, restoring the rendered title when unset", () => {
    const { widget, visual, filter } = renderWidget();
    const titled = { ...widgetData, title_settings: { ...widgetData.title_settings, text: "Statewide" } };
    widget.renderValue(titled);
    const titleText = () => visual.svg.select(".chart-title").text();
    widget.setTitle("Alpha, Bravo");
    expect(titleText()).toBe("Alpha, Bravo");
    widget.resize(400, 250);
    filter.set(["r1"]);
    expect(titleText()).toBe("Alpha, Bravo");
    widget.setTitle(undefined);
    expect(titleText()).toBe("Statewide");
  });

  it("pads the plot for a title set on an untitled widget, and unpads it once the title is unset", () => {
    const { widget, visual } = renderWidget();
    const upperPadding = () => must(visual.updates[visual.updates.length - 1].dataViews?.[0].categorical?.categories?.[0].objects?.[0].canvas)
      .upper_padding;
    expect(upperPadding()).toBe(10);
    widget.setTitle("Alpha");
    // The default 16px title, 5px down
    expect(upperPadding()).toBe(31);
    expect(visual.svg.select(".chart-title").text()).toBe("Alpha");
    widget.setTitle(undefined);
    expect(upperPadding()).toBe(10);
    expect(visual.svg.select(".chart-title").empty()).toBe(true);
  });

  it("selects every identity given as an array, as one selection", async () => {
    const { visual, selection } = renderWidget();
    const category = must(visual.updates[visual.updates.length - 1].dataViews?.[0].categorical?.categories?.[0]);
    const selectionManager = visual.host.createSelectionManager();
    const a = visual.host.createSelectionIdBuilder().withCategory(category, 0).createSelectionId();
    const b = visual.host.createSelectionIdBuilder().withCategory(category, 1).createSelectionId();
    await selectionManager.select([a, b]);
    expect([...must(selection.keys)].sort()).toEqual(["r1", "r2", "r3"]);
    await selectionManager.select([a]);
    expect(selection.keys).toEqual(["r1", "r3"]);
    await selectionManager.select([a, b]);
    expect([...must(selection.keys)].sort()).toEqual(["r1", "r2", "r3"]);
  });

  it("reports each selected key and every grouped row holding one, highlighting on each change", () => {
    const { visual, selection } = renderWidget();
    const selectionManager = visual.host.createSelectionManager();
    const category = must(visual.updates[visual.updates.length - 1].dataViews?.[0].categorical?.categories?.[0]);
    const a = visual.host.createSelectionIdBuilder().withCategory(category, 0).createSelectionId();
    const b = visual.host.createSelectionIdBuilder().withCategory(category, 1).createSelectionId();
    expect(selectionManager.getSelectionIds()).toEqual([]);
    expect(visual.highlights).toBe(0);
    // Another widget's rows need not be in this one
    selection.set(["r3", "other"]);
    expect(visual.highlights).toBe(1);
    expect(keysOf(selectionManager)).toEqual(keyedBy(["r3"], ["other"], ["r1", "r3"]));
    const state = selectionState(selectionManager, false);
    expect([state.active, identitySelected(a, state.selected), identitySelected(b, state.selected)]).toEqual([true, true, false]);
    selection.clear();
    expect(visual.highlights).toBe(2);
    expect(selectionState(selectionManager, false).active).toBe(false);
  });

  it("re-aggregates every row once the filter clears, and none while the filter is empty", () => {
    const { visual, filter } = renderWidget(["r2"]);
    expect(drawn(visual)).toEqual({ categories: ["b"], numerators: [2] });
    filter.clear();
    expect(drawn(visual)).toEqual({ categories: ["a", "b"], numerators: [4, 2] });
    filter.set([]);
    expect(drawn(visual)).toEqual({ categories: [], numerators: [] });
    expect(visual.svg.select(".errormessage").empty()).toBe(false);
  });

  it("draws non-Crosstalk widgets as aggregated, ignoring filters, with their rows' keys as given", () => {
    const aggregated = makeUpdateValues(widgetData.data_raw, {}, defaultAggregations);
    const data: WidgetData = {
      ...widgetData, is_crosstalk: false, update_values: { dataViews: aggregated.dataViews, crosstalk_identities: ["k1", ["k2", "k3"]] }
    };
    const { visual, filter, selection } = renderWidget(["k1"], data);
    expect(drawn(visual)).toEqual({ categories: ["a", "b"], numerators: [4, 2] });
    const updates = visual.updates.length;
    filter.set(["k2"]);
    filter.clear();
    expect(visual.updates.length).toBe(updates);
    const category = must(visual.updates[visual.updates.length - 1].dataViews?.[0].categorical?.categories?.[0]);
    const builder = () => visual.host.createSelectionIdBuilder();
    expect(builder().withCategory(category, 0).createSelectionId().getKey()).toBe(selectionId(["k1"]).getKey());
    expect(builder().withCategory(category, 1).createSelectionId().getKey()).toBe(selectionId(["k2", "k3"]).getKey());
    selection.set(["k3"]);
    expect(keysOf(visual.host.createSelectionManager())).toEqual(keyedBy(["k3"], ["k2", "k3"]));
  });

  it("removes tooltips on hide", () => {
    const { visual } = renderWidget();
    visual.host.tooltipService.show({ dataItems: [{ displayName: "Value", value: "4" }], coordinates: [10, 20], isTouchEvent: false, identities: [] });
    visual.host.tooltipService.hide({ immediately: true, isTouchEvent: false });
    expect(visual.svg.select(".chart-tooltip-group").selectChildren().size()).toBe(0);
  });
});

type Download = { readonly name: string; readonly blob: Blob };

/** Captures the downloads export triggers, without navigating */
function captureDownloads(): { readonly downloads: Download[]; restore(): void } {
  const downloads: Download[] = [];
  const blobs = new Map<string, Blob>();
  const createObjectURL = URL.createObjectURL.bind(URL);
  const click = HTMLAnchorElement.prototype.click;
  URL.createObjectURL = (object: Blob | MediaSource): string => {
    const url = createObjectURL(object);
    if (object instanceof Blob) {
      blobs.set(url, object);
    }
    return url;
  };
  HTMLAnchorElement.prototype.click = function (this: HTMLAnchorElement): void {
    downloads.push({ name: this.download, blob: must(blobs.get(this.href)) });
  };
  return {
    downloads,
    restore: () => {
      URL.createObjectURL = createObjectURL;
      HTMLAnchorElement.prototype.click = click;
    }
  };
}

function exportControl(el: HTMLElement): { control: HTMLDetailsElement; summary: HTMLElement; buttons: HTMLButtonElement[]; status: HTMLElement } {
  const control = must(el.querySelector<HTMLDetailsElement>("details.controlcharts-export"));
  return {
    control,
    summary: must(control.querySelector("summary")),
    buttons: Array.from(control.querySelectorAll("button")),
    status: must(control.querySelector<HTMLElement>(".controlcharts-export-status"))
  };
}

describe("chart export", () => {
  it("offers SVG and PNG buttons, closing on Escape or when focus leaves, without passing clicks to the page", () => {
    const { el } = renderWidget();
    const { control, summary, buttons } = exportControl(el);
    expect(el.classList.contains("controlcharts-widget")).toBe(true);
    expect([buttons[0].dataset.format, buttons[1].dataset.format, buttons[0].textContent, buttons[1].textContent]).toEqual(["svg", "png", "SVG", "PNG"]);
    let pageClicks = 0;
    let pageKeys = 0;
    el.addEventListener("click", () => {
      pageClicks++;
    });
    el.addEventListener("keydown", () => {
      pageKeys++;
    });
    summary.click();
    expect(control.open).toBe(true);
    expect(pageClicks).toBe(0);
    control.dispatchEvent(new KeyboardEvent("keydown", { key: "Enter", bubbles: true }));
    expect([control.open, pageKeys]).toEqual([true, 1]);
    control.dispatchEvent(new KeyboardEvent("keydown", { key: "Escape", bubbles: true }));
    expect([control.open, pageKeys, document.activeElement]).toEqual([false, 1, summary]);
    control.open = true;
    control.dispatchEvent(new FocusEvent("focusout", { relatedTarget: buttons[1] }));
    expect(control.open).toBe(true);
    control.dispatchEvent(new FocusEvent("focusout", { relatedTarget: el }));
    expect(control.open).toBe(false);
    el.click();
    expect(pageClicks).toBe(1);
  });

  it("downloads a standalone SVG named after the title, with styles inlined and the tooltip removed", async () => {
    const { el, visual, widget } = renderWidget();
    widget.setTitle(" Falls: Ward A/B? ");
    visual.host.tooltipService.show({ dataItems: [{ displayName: "Value", value: "4" }], coordinates: [10, 20], isTouchEvent: false, identities: [] });
    const { control, buttons } = exportControl(el);
    const capture = captureDownloads();
    try {
      control.open = true;
      buttons[0].click();
      await vi.waitFor(() => {
        expect(capture.downloads.length).toBe(1);
      });
      expect(capture.downloads[0].name).toBe("Falls- Ward A-B-.svg");
      expect(capture.downloads[0].blob.type).toBe("image/svg+xml;charset=utf-8");
      const parsed = new DOMParser().parseFromString(await capture.downloads[0].blob.text(), "image/svg+xml");
      const root = must(parsed.documentElement);
      expect([root.tagName, root.getAttribute("xmlns"), root.getAttribute("width"), root.getAttribute("height")])
        .toEqual(["svg", "http://www.w3.org/2000/svg", "300", "150"]);
      expect(root.getAttribute("viewBox")).toBe("0 0 300 150");
      const background = must(root.firstElementChild);
      expect([background.tagName, background.getAttribute("fill")]).toEqual(["rect", "white"]);
      expect(parsed.querySelector(".chart-tooltip-group")).toBeNull();
      const title = must(parsed.querySelector<SVGElement>(".chart-title"));
      expect(title.textContent).toBe(" Falls: Ward A/B? ");
      expect(title.style.getPropertyValue("font-weight")).toBe("700");
      expect(title.style.getPropertyValue("font-size")).toBe("16px");
      // The widget's own SVG keeps its tooltip
      expect(visual.svg.select(".chart-tooltip-group").selectChildren().size()).toBeGreaterThan(0);
      expect([control.open, document.activeElement]).toEqual([false, exportControl(el).summary]);
    } finally {
      capture.restore();
    }
  });

  it.each([
    { title: undefined, name: "test" },
    { title: "...", name: "test" },
    { title: "   ", name: "test" },
    { title: "Report v1.2. ", name: "Report v1.2" },
    { title: "a<b>c|d*e\\f\u0001g", name: "a-b-c-d-e-f-g" }
  ])("names the file $name for the title $title", async ({ title, name }) => {
    const { el, widget } = renderWidget();
    widget.setTitle(title);
    const capture = captureDownloads();
    try {
      exportControl(el).buttons[0].click();
      await vi.waitFor(() => {
        expect(capture.downloads.length).toBe(1);
      });
      expect(capture.downloads[0].name).toBe(`${name}.svg`);
    } finally {
      capture.restore();
    }
  });

  it("rasterises the PNG at twice the chart's size, disabling the buttons meanwhile", async () => {
    const { el } = renderWidget();
    const { control, buttons } = exportControl(el);
    const capture = captureDownloads();
    try {
      buttons[1].click();
      expect([control.getAttribute("aria-busy"), buttons[0].disabled, buttons[1].disabled]).toEqual(["true", true, true]);
      await vi.waitFor(() => {
        expect(capture.downloads.length).toBe(1);
      });
      expect([control.hasAttribute("aria-busy"), buttons[0].disabled, buttons[1].disabled]).toEqual([false, false, false]);
      expect([capture.downloads[0].name, capture.downloads[0].blob.type]).toEqual(["test.png", "image/png"]);
      const bitmap = await createImageBitmap(capture.downloads[0].blob);
      expect([bitmap.width, bitmap.height]).toEqual([600, 300]);
    } finally {
      capture.restore();
    }
  });

  it("reports a failed export in the status, leaving the control usable", async () => {
    const { el } = renderWidget();
    const { control, buttons, status } = exportControl(el);
    const capture = captureDownloads();
    const toBlob = HTMLCanvasElement.prototype.toBlob;
    HTMLCanvasElement.prototype.toBlob = function (callback: BlobCallback): void {
      callback(null);
    };
    try {
      control.open = true;
      buttons[1].click();
      await vi.waitFor(() => {
        expect(status.textContent).toBe("Could not export image. Please try again.");
      });
      expect([capture.downloads.length, control.open, control.hasAttribute("aria-busy"), buttons[1].disabled]).toEqual([0, true, false, false]);
      HTMLCanvasElement.prototype.toBlob = toBlob;
      buttons[1].click();
      expect(status.textContent).toBe("");
      await vi.waitFor(() => {
        expect(capture.downloads.length).toBe(1);
      });
    } finally {
      HTMLCanvasElement.prototype.toBlob = toBlob;
      capture.restore();
    }
  });
});
