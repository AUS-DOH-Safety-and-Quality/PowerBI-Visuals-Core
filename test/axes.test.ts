import { describe, expect, it } from "vitest";
import { drawAxis, drawPlotAxes, measureAxisEdge, type PlotFrame } from "../src/rendering/index";
import type { AxisDrawOptions } from "../src/rendering/drawAxis";
import { svgElement, frame, settings, host, points, context } from "./browserHelpers";

function axisOptions(plotFrame: PlotFrame, overrides: Partial<AxisDrawOptions> = {}): AxisDrawOptions {
  return {
    axis: "x",
    frame: plotFrame,
    show: true,
    tickFormat: undefined,
    labelSize: 10,
    measure: false,
    ...overrides
  };
}

describe("axis drawing", () => {
  it("draws ticks on the padded edge with the settings colours", () => {
    const svg = svgElement();
    drawAxis(svg, axisOptions(frame()));
    const group = svg.querySelector<SVGGElement>(".xaxisgroup")!;
    expect(group.getAttribute("transform")).toBe("translate(0, 390)");
    expect(group.getAttribute("color")).toBe("#000000");
    const ticks = group.querySelectorAll(".tick");
    expect(ticks).toHaveLength(11);
    expect(ticks[0].querySelector("text")!.textContent).toBe("0");
    expect(ticks[10].querySelector("text")!.textContent).toBe("10");
    expect(ticks[0].querySelector("text")!.style.fontSize).toBe("10px");
    expect(ticks[0].querySelector("line")!.style.stroke).toBe("currentcolor");
    expect(svg.querySelectorAll(".xgridline")).toHaveLength(0);
  });

  it("draws the y axis on the left padding edge with formatted ticks", () => {
    const svg = svgElement();
    drawAxis(svg, axisOptions(frame(), { axis: "y", tickFormat: value => `${value}%` }));
    const group = svg.querySelector<SVGGElement>(".yaxisgroup")!;
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
    const label = svg.querySelector<SVGTextElement>(".xaxislabel")!;
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

  it("measures a drawn axis to place the title between it and the canvas edge", () => {
    const svg = svgElement();
    drawAxis(svg, axisOptions(frame(), { measure: true }));
    const group = svg.querySelector<SVGGElement>(".xaxisgroup")!;
    // Tick labels hang below the axis line at 390, so the measured edge lies beneath it
    const edge = measureAxisEdge(svg, group, "bottom");
    expect(edge).toBeGreaterThan(390);
    expect(Number(svg.querySelector(".xaxislabel")!.getAttribute("y"))).toBeCloseTo(400 - (400 - edge) / 2, 6);
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
    expect(svg.querySelector(".xaxisgroup")!.nextElementSibling!.classList.contains("xaxislabel")).toBe(true);
    expect(svg.querySelector(".linesgroup")!.previousElementSibling).not.toBeNull();
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
    expect(svg.querySelector(".xaxisgroup .tick text")!.textContent).toBe("d0");
    expect(svg.querySelector(".yaxisgroup")).toBeNull();
    expect(svg.querySelector(".xaxislabel")!.getAttribute("y")).toBe("395");
  });
});
