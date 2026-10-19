import { describe, expect, it } from "vitest";
import { drawAxis, drawPlotAxes, measureAxisEdge, type PlotFrame } from "../src/rendering/index";
import type { AxisDrawOptions } from "../src/rendering/drawAxis";
import { svgElement, frame, settings, host, points, context, pluck } from "./browserHelpers";
import { must } from "../src/testing/index";

// d3-array 3.2.4: ticks(0, 3, 10)
const fractionalTicks = ["0", "0.2", "0.4", "0.6", "0.8", "1", "1.2", "1.4", "1.6", "1.8", "2", "2.2", "2.4", "2.6", "2.8", "3"];

function tickLabels(svg: SVGSVGElement, axis: "x" | "y"): (string | null)[] {
  return pluck(svg.querySelectorAll(`.${axis}axisgroup .tick text`), "textContent");
}

function axisOptions(plotFrame: PlotFrame, overrides: Partial<AxisDrawOptions> = {}): AxisDrawOptions {
  return {
    axis: "x",
    frame: plotFrame,
    show: true,
    tickFormat: undefined,
    labelSize: 10,
    measure: false,
    integer: false,
    ...overrides
  };
}

describe("axis drawing", () => {
  it("draws ticks on the padded edge with the settings colours", () => {
    const svg = svgElement();
    drawAxis(svg, axisOptions(frame()));
    const group = must(svg.querySelector<SVGGElement>(".xaxisgroup"));
    expect(group.getAttribute("transform")).toBe("translate(0, 390)");
    expect(group.getAttribute("color")).toBe("#000000");
    const ticks = group.querySelectorAll(".tick");
    expect(ticks).toHaveLength(11);
    expect(must(ticks[0].querySelector("text")).textContent).toBe("0");
    expect(must(ticks[10].querySelector("text")).textContent).toBe("10");
    expect(must(ticks[0].querySelector("text")).style.fontSize).toBe("10px");
    expect(must(ticks[0].querySelector("line")).style.stroke).toBe("currentcolor");
    expect(svg.querySelectorAll(".xgridline")).toHaveLength(0);
  });

  it("draws the y axis on the left padding edge with formatted ticks", () => {
    const svg = svgElement();
    drawAxis(svg, axisOptions(frame(), { axis: "y", tickFormat: value => `${value}%` }));
    const group = must(svg.querySelector<SVGGElement>(".yaxisgroup"));
    expect(group.getAttribute("transform")).toBe("translate(10, 0)");
    const labels = group.querySelectorAll(".tick text");
    expect(labels[0].textContent).toBe("0%");
    expect(labels[labels.length - 1].textContent).toBe("100%");
  });

  it("places the title by alignment and draws gridlines across the plot when asked", () => {
    const svg = svgElement();
    const titled = frame({ settings: {
      ...settings,
      x_axis: {
        ...settings.x_axis,
        xlimit_label: "Date",
        xlimit_label_align: "right",
        xlimit_grid_show: true,
        xlimit_grid_colour: "#ff0000",
        xlimit_grid_width: 2
      }
    } });
    drawAxis(svg, axisOptions(titled));
    const label = must(svg.querySelector<SVGTextElement>(".xaxislabel"));
    expect(label.textContent).toBe("Date");
    expect(label.style.textAnchor).toBe("end");
    expect(label.getAttribute("x")).toBe("490");
    // Unmeasured: half a label size above the canvas edge
    expect(label.getAttribute("y")).toBe("395");
    const gridlines = svg.querySelectorAll<SVGLineElement>(".gridgroup .xgridline");
    expect(gridlines).toHaveLength(11);
    // The title reserves its font size below the plot, so the axis edge rises to 380
    expect(gridlines[0].getAttribute("y1")).toBe("380");
    expect(gridlines[0].getAttribute("y2")).toBe("10");
    expect(gridlines[0].style.stroke).toBe("rgb(255, 0, 0)");
    expect(gridlines[0].style.strokeWidth).toBe("2");
  });

  it("measures drawn axes to centre their titles beyond the tick labels, abutting them when the gap is too narrow", () => {
    const svg = svgElement();
    const titled = frame({ settings: {
      ...settings,
      canvas: { ...settings.canvas, left_padding: 60 },
      x_axis: { ...settings.x_axis, xlimit_label: "Source: a long axis title" },
      y_axis: { ...settings.y_axis, ylimit_label: "Rate" }
    } });
    drawAxis(svg, axisOptions(titled, { measure: true }));
    drawAxis(svg, axisOptions(titled, { axis: "y", measure: true }));
    const bounds = svg.getBoundingClientRect();
    // Tick labels hang below the axis line at 390, leaving less than a title's height
    const xEdge = measureAxisEdge(must(svg.querySelector<SVGGElement>(".xaxisgroup")), 400 - titled.yAxis.start_padding, "bottom");
    expect(xEdge).toBeGreaterThan(390);
    const xTitle = must(svg.querySelector<SVGTextElement>(".xaxislabel")).getBBox();
    expect(400 - xEdge).toBeLessThan(xTitle.height);
    // SVG boxes are single precision
    expect(xTitle.y).toBeCloseTo(xEdge, 4);
    const yEdge = measureAxisEdge(must(svg.querySelector<SVGGElement>(".yaxisgroup")), titled.xAxis.start_padding, "left");
    const yTitle = must(svg.querySelector(".yaxislabel")).getBoundingClientRect();
    expect(yEdge).toBeGreaterThan(yTitle.width);
    expect(yTitle.left - bounds.left).toBeCloseTo((yEdge - yTitle.width) / 2, 2);
  });

  it("places measured titles in the svg's units, whatever its CSS scaling", () => {
    const titled = frame({ settings: {
      ...settings,
      x_axis: { ...settings.x_axis, xlimit_label: "Month", xlimit_tick_rotation: -45 },
      y_axis: { ...settings.y_axis, ylimit_label: "Rate" }
    } });
    function titles(scale: string): (string | null)[] {
      const svg = svgElement();
      must(svg.parentElement).style.transform = scale;
      drawAxis(svg, axisOptions(titled, { measure: true }));
      drawAxis(svg, axisOptions(titled, { axis: "y", measure: true }));
      return [must(svg.querySelector(".xaxislabel")).getAttribute("y"), must(svg.querySelector(".yaxislabel")).getAttribute("x")];
    }
    // As reveal.js scales its slides
    expect(titles("scale(0.5)")).toEqual(titles("none"));
  });

  it("keeps the unmeasured title placement while the svg is hidden", () => {
    const svg = svgElement();
    must(svg.parentElement).style.display = "none";
    const titled = frame({ settings: {
      ...settings, x_axis: { ...settings.x_axis, xlimit_label: "Month" }, y_axis: { ...settings.y_axis, ylimit_label: "Rate" }
    } });
    drawAxis(svg, axisOptions(titled, { measure: true }));
    drawAxis(svg, axisOptions(titled, { axis: "y", measure: true }));
    // A label size in from the canvas edge
    expect(must(svg.querySelector(".xaxislabel")).getAttribute("y")).toBe("395");
    expect(must(svg.querySelector(".yaxislabel")).getAttribute("x")).toBe("15");
  });

  it("draws no ticks when the axis has none", () => {
    const svg = svgElement();
    drawAxis(svg, axisOptions(frame({ settings: { ...settings, x_axis: { ...settings.x_axis, xlimit_ticks: false } } })));
    expect(svg.querySelectorAll(".xaxisgroup .tick")).toHaveLength(0);
  });

  it("hides the axis, its title and gridlines without a plot, keeping their colours", () => {
    const svg = svgElement();
    drawAxis(svg, axisOptions(frame({
      displayPlot: false,
      settings: { ...settings, x_axis: { ...settings.x_axis, xlimit_grid_show: true } }
    })));
    const group = svg.querySelector(".xaxisgroup");
    expect(group?.getAttribute("visibility")).toBe("hidden");
    expect(group?.getAttribute("color")).toBe(settings.x_axis.xlimit_colour);
    expect(svg.querySelector(".xaxislabel")?.getAttribute("visibility")).toBe("hidden");
    expect(svg.querySelectorAll(".xgridline")).toHaveLength(0);
  });

  it("removes the axis, its title and gridlines when not shown, and redraws in place afterwards", () => {
    const svg = svgElement();
    const gridded = frame({ settings: { ...settings, x_axis: { ...settings.x_axis, xlimit_grid_show: true } } });
    drawAxis(svg, axisOptions(gridded));
    drawAxis(svg, axisOptions(gridded, { show: false }));
    expect(svg.querySelector(".xaxisgroup")).toBeNull();
    expect(svg.querySelector(".xaxislabel")).toBeNull();
    expect(svg.querySelectorAll(".xgridline")).toHaveLength(0);
    drawAxis(svg, axisOptions(gridded));
    expect(svg.querySelectorAll(".xaxisgroup")).toHaveLength(1);
    expect(must(must(svg.querySelector(".xaxisgroup")).nextElementSibling).classList.contains("xaxislabel")).toBe(true);
    expect(must(svg.querySelector(".linesgroup")).previousElementSibling).not.toBeNull();
  });

  it("keeps only whole-number ticks on an integer axis", () => {
    const svg = svgElement();
    const small = frame({ x: { lower: 0, upper: 3 } });
    drawAxis(svg, axisOptions(small));
    expect(tickLabels(svg, "x")).toEqual(fractionalTicks);
    drawAxis(svg, axisOptions(small, { integer: true }));
    expect(tickLabels(svg, "x")).toEqual(["0", "1", "2", "3"]);
  });
});

describe("plot axes from a context", () => {
  it("draws both axes from the axis settings and skips measurement for the frontend", () => {
    const svg = svgElement();
    const visualHost = host();
    const ctx = context(visualHost, points(visualHost, [10, 20]), {
      settings: { ...settings, y_axis: { ...settings.y_axis, ylimit_show: false } }
    });
    drawPlotAxes(svg, ctx, { x: value => `d${value}`, y: undefined });
    expect(must(svg.querySelector(".xaxisgroup .tick text")).textContent).toBe("d0");
    expect(svg.querySelector(".yaxisgroup")).toBeNull();
    expect(must(svg.querySelector(".xaxislabel")).getAttribute("y")).toBe("395");
  });

  it("keeps whole-number y ticks and gridlines for integer y formats, leaving the x axis fractional", () => {
    const svg = svgElement();
    const visualHost = host();
    const gridded = { ...settings, y_axis: { ...settings.y_axis, ylimit_grid_show: true } };
    const ctx = context(visualHost, points(visualHost, [1, 2]), {
      frame: frame({ x: { lower: 0, upper: 3 }, y: { lower: 0, upper: 3 }, settings: gridded })
    });
    drawPlotAxes(svg, ctx, { x: undefined, y: undefined, yInteger: true });
    expect(tickLabels(svg, "y")).toEqual(["0", "1", "2", "3"]);
    expect(svg.querySelectorAll(".ygridline")).toHaveLength(4);
    expect(tickLabels(svg, "x")).toEqual(fractionalTicks);
  });
});
