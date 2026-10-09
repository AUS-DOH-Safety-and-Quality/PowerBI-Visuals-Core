import { describe, expect, it, vi } from "vitest";
import {
  drawErrorMessage, drawCrosshairs, drawDownloadButton, bindContextMenu, drawPlotTooltips, drawPlotDownload, initialiseSvg, fitPlotToOverflow
} from "../src/rendering/index";
import type { ErrorMessageOptions } from "../src/rendering/errorMessage";
import { toCsv } from "../src/data/index";
import { svgElement, frame, host, points, context, client, settings } from "./browserHelpers";

function errorOptions(message: string, overrides: Partial<ErrorMessageOptions> = {}): ErrorMessageOptions {
  return {
    width: 500,
    height: 300,
    message,
    kind: undefined,
    colour: "#000",
    show: true,
    ...overrides
  };
}

describe("error message", () => {
  it("replaces the plot with the preamble and message, and clears it again", () => {
    const svg = svgElement();
    svg.querySelector(".dotsgroup")!.appendChild(svg.ownerDocument.createElementNS("http://www.w3.org/2000/svg", "path"));
    drawErrorMessage(svg, errorOptions("Bad input", { kind: "settings", colour: "#ff0000" }));
    const texts = svg.querySelectorAll<SVGTextElement>(".errormessage text");
    expect(texts).toHaveLength(2);
    expect(texts[0].textContent).toBe("Invalid settings provided for all observations! First error:");
    expect(texts[1].textContent).toBe("Bad input");
    expect(texts[1].getAttribute("x")).toBe("250");
    expect(texts[1].getAttribute("y")).toBe("150");
    expect(texts[1].style.fill).toBe("rgb(255, 0, 0)");
    expect(svg.querySelector(".dotsgroup path")).toBeNull();
    drawErrorMessage(svg, errorOptions("Quiet", { show: false }));
    expect(svg.querySelector(".errormessage")).toBeNull();
    expect(svg.querySelector(".dotsgroup")).not.toBeNull();
  });

  it("shows only the message for an unkinded error", () => {
    const svg = svgElement();
    drawErrorMessage(svg, errorOptions("Plain"));
    expect(svg.querySelectorAll(".errormessage text")).toHaveLength(1);
  });
});

describe("crosshairs", () => {
  it("sizes both lines across the plot and toggles their opacity at a point", () => {
    const svg = svgElement();
    const vertical = svg.querySelector<SVGLineElement>(".ttip-line-x")!;
    const horizontal = svg.querySelector<SVGLineElement>(".ttip-line-y")!;
    const crosshairs = drawCrosshairs({
      vertical,
      horizontal,
      left: 10,
      right: 490,
      top: 5,
      bottom: 390,
      colour: "#00ff00"
    });
    expect([vertical.getAttribute("y1"), vertical.getAttribute("y2")]).toEqual(["5", "390"]);
    expect([horizontal.getAttribute("x1"), horizontal.getAttribute("x2")]).toEqual(["10", "490"]);
    expect(vertical.getAttribute("stroke")).toBe("#00ff00");
    expect(vertical.style.strokeOpacity).toBe("0");
    crosshairs.show(123, 45);
    expect([vertical.getAttribute("x1"), vertical.getAttribute("x2")]).toEqual(["123", "123"]);
    expect([horizontal.getAttribute("y1"), horizontal.getAttribute("y2")]).toEqual(["45", "45"]);
    expect(horizontal.style.strokeOpacity).toBe("0.4");
    crosshairs.hide();
    expect(vertical.style.strokeOpacity).toBe("0");
  });
});

describe("download button", () => {
  it("keeps one positioned link that fires the handler, and removes it when hidden", () => {
    const svg = svgElement();
    const onClick = vi.fn();
    drawDownloadButton(svg, { visible: true, x: 450, y: 395, onClick });
    drawDownloadButton(svg, { visible: true, x: 440, y: 395, onClick });
    const buttons = svg.querySelectorAll<SVGTextElement>(".download-btn-group");
    expect(buttons).toHaveLength(1);
    expect(buttons[0].textContent).toBe("Download");
    expect(buttons[0].getAttribute("x")).toBe("440");
    expect(buttons[0].style.textDecoration).toBe("underline");
    buttons[0].dispatchEvent(new MouseEvent("click"));
    expect(onClick).toHaveBeenCalledTimes(1);
    drawDownloadButton(svg, { visible: false, x: 440, y: 395, onClick });
    expect(svg.querySelector(".download-btn-group")).toBeNull();
  });

  it("exports the rows as chartdata.csv through the host", () => {
    const svg = svgElement();
    const visualHost = host();
    const rows = [{ date: "A", value: 1 }, { date: "B", value: 2 }];
    drawPlotDownload(svg, context(visualHost, points(visualHost, [1, 2])), () => rows);
    expect(svg.querySelector(".download-btn-group")).toBeNull();
    const shown = context(visualHost, points(visualHost, [1, 2]), {
      settings: { ...settings, download_options: { show_button: true } }
    });
    drawPlotDownload(svg, shown, () => rows);
    const button = svg.querySelector<SVGTextElement>(".download-btn-group")!;
    expect(button.getAttribute("x")).toBe("450");
    expect(button.getAttribute("y")).toBe("395");
    button.dispatchEvent(new MouseEvent("click"));
    expect(visualHost.downloadService.exportVisualsContent).toHaveBeenCalledWith(toCsv(rows), "chartdata.csv", "csv", "csv file");
  });
});

describe("context menu", () => {
  it("shows the identity under the pointer, prevents the native menu, rebinds without stacking and unbinds when disabled", () => {
    const svg = svgElement();
    const child = svg.querySelector(".dotsgroup")!;
    const show = vi.fn();
    const options = {
      enabled: true,
      identity: (target: EventTarget | null) => (target === child ? "dot" : "background"),
      show
    };
    bindContextMenu(svg, options);
    bindContextMenu(svg, options);
    const event = new MouseEvent("contextmenu", { bubbles: true, cancelable: true, clientX: 7, clientY: 9 });
    child.dispatchEvent(event);
    expect(show).toHaveBeenCalledTimes(1);
    expect(show).toHaveBeenCalledWith("dot", { x: 7, y: 9 });
    expect(event.defaultPrevented).toBe(true);
    svg.dispatchEvent(new MouseEvent("contextmenu", { bubbles: true, cancelable: true, clientX: 1, clientY: 2 }));
    expect(show).toHaveBeenLastCalledWith("background", { x: 1, y: 2 });
    bindContextMenu(svg, { ...options, enabled: false });
    const ignored = new MouseEvent("contextmenu", { bubbles: true, cancelable: true });
    child.dispatchEvent(ignored);
    expect(show).toHaveBeenCalledTimes(2);
    expect(ignored.defaultPrevented).toBe(false);
  });
});

describe("plot tooltips", () => {
  it("follows the nearest point by horizontal distance, showing the tooltip and crosshairs, and hides both on leaving", () => {
    const svg = svgElement();
    const visualHost = host();
    const plotPoints = points(visualHost, [10, 90, 50]);
    const ctx = context(visualHost, plotPoints);
    drawPlotTooltips(svg, ctx, false);
    const f = ctx.frame;
    const vertical = svg.querySelector<SVGLineElement>(".ttip-line-x")!;
    // Horizontally nearest point 1 even though point 2 is vertically closer
    svg.dispatchEvent(new MouseEvent("mousemove", { ...client(svg, f.xScale(1) + 5, f.yScale(50)) }));
    expect(visualHost.tooltipService.show).toHaveBeenCalledWith({
      dataItems: plotPoints[1].tooltip,
      identities: [plotPoints[1].identity],
      coordinates: [f.xScale(1), f.yScale(90)],
      isTouchEvent: false
    });
    expect(vertical.getAttribute("x1")).toBe(String(f.xScale(1)));
    expect(vertical.style.strokeOpacity).toBe("0.4");
    svg.dispatchEvent(new MouseEvent("mouseleave"));
    expect(visualHost.tooltipService.hide).toHaveBeenCalledWith({ immediately: true, isTouchEvent: false });
    expect(vertical.style.strokeOpacity).toBe("0");
  });

  it("includes vertical distance when asked", () => {
    const svg = svgElement();
    const visualHost = host();
    const plotPoints = points(visualHost, [10, 90, 50]);
    const ctx = context(visualHost, plotPoints);
    drawPlotTooltips(svg, ctx, true);
    const f = ctx.frame;
    svg.dispatchEvent(new MouseEvent("mousemove", { ...client(svg, f.xScale(1) + 5, f.yScale(50)) }));
    expect(visualHost.tooltipService.show).toHaveBeenCalledWith(expect.objectContaining({ identities: [plotPoints[2].identity] }));
  });

  it("does nothing while the plot is hidden and is dropped by an svg reset", () => {
    const svg = svgElement();
    const visualHost = host();
    const plotPoints = points(visualHost, [10, 20]);
    drawPlotTooltips(svg, context(visualHost, plotPoints, { frame: frame({ displayPlot: false }) }), false);
    svg.dispatchEvent(new MouseEvent("mousemove", { ...client(svg, 100, 100) }));
    expect(visualHost.tooltipService.show).not.toHaveBeenCalled();
    drawPlotTooltips(svg, context(visualHost, plotPoints), false);
    initialiseSvg(svg, true);
    svg.dispatchEvent(new MouseEvent("mousemove", { ...client(svg, 100, 100) }));
    expect(visualHost.tooltipService.show).not.toHaveBeenCalled();
  });
});

describe("overflow fitting", () => {
  it("grows the padding by the drawn overflow and rebuilds the scales", () => {
    const svg = svgElement();
    const rect = svg.ownerDocument.createElementNS("http://www.w3.org/2000/svg", "rect");
    rect.setAttribute("x", "-20");
    rect.setAttribute("y", "395");
    rect.setAttribute("width", "10");
    rect.setAttribute("height", "10");
    svg.querySelector(".dotsgroup")!.appendChild(rect);
    const fitted = fitPlotToOverflow(svg, frame())!;
    expect(fitted.xAxis.start_padding).toBe(30);
    expect(fitted.yAxis.start_padding).toBe(15);
    expect(fitted.xAxis.end_padding).toBe(10);
    expect(fitted.xScale(0)).toBe(30);
    expect(fitted.yScale(0)).toBe(385);
    rect.remove();
    expect(fitPlotToOverflow(svg, frame())).toBeUndefined();
  });
});
