import { describe, expect, it } from "vitest";
import { chartTitle } from "../src/frontends/index";
import { makeFactory, type WidgetData } from "../src/frontends/interactive";
import { updateType } from "../src/powerbi/index";
import { must } from "../src/testing/index";
import { TestVisual } from "./frontendHelpers";

type Listener = (event: { readonly value: string[] | null }) => void;

/** Crosstalk's handles, keeping the value and listeners in memory */
class FakeHandle {
  static readonly instances: FakeHandle[] = [];
  value: string[] | null = null;
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
    this.value = keys;
    for (let i = 0; i < this.listeners.length; i++) {
      this.listeners[i]({ value: keys });
    }
  }
  clear(): void {
    this.set(null);
  }
}
Object.assign(globalThis, { crosstalk: { FilterHandle: FakeHandle, SelectionHandle: FakeHandle } });

const title = chartTitle(null);
if ("error" in title) {
  throw new Error(title.error);
}
const widgetData: WidgetData = {
  title_settings: title.settings,
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
  data_raw: { categories: ["a", "b", "a"], numerators: [1, 2, 3], crosstalk_identities: ["r1", "r2", "r3"] },
  input_settings: {},
  aggregations: { numerators: "sum", denominators: "sum", groupings: "first", xbar_sds: "first", tooltips: "first", labels: "first" }
};

/** The widget, its visual, and its filter and selection handles, which the factory creates in that order */
function renderWidget() {
  const handles = FakeHandle.instances.length;
  const widget = makeFactory("test")(document.body.appendChild(document.createElement("div")), 300, 200);
  widget.renderValue(widgetData);
  const visual = must(TestVisual.instances[TestVisual.instances.length - 1]);
  return { widget, visual, filter: must(FakeHandle.instances[handles]), selection: must(FakeHandle.instances[handles + 1]) };
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
    expect(selection.value).toEqual(["r2", "r1", "r3"]);
    await selectionManager.clear();
    expect(selection.value).toBeNull();
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

  it("removes tooltips on hide", () => {
    const { visual } = renderWidget();
    visual.host.tooltipService.show({ dataItems: [{ displayName: "Value", value: "4" }], coordinates: [10, 20], isTouchEvent: false, identities: [] });
    visual.host.tooltipService.hide({ immediately: true, isTouchEvent: false });
    expect(visual.svg.select(".chart-tooltip-group").selectChildren().size()).toBe(0);
  });
});
