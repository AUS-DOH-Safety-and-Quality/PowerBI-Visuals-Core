import type powerbi from "powerbi-visuals-api";
import { select } from "d3-selection";
import { symbol, symbolCircle, symbolCross, symbolDiamond, symbolSquare, symbolStar, symbolTriangle, symbolWye, type SymbolType } from "d3-shape";
import screenToSvg from "./screenToSvg";
import { inPlot, type PlotFrame } from "./plotFrame";

export type DotAesthetics = {
  readonly shape: string;
  readonly size: number;
  readonly colour: string;
  readonly colour_outline: string;
  readonly width_outline: number;
};

export type DotPoint = {
  readonly x: number;
  readonly value: number;
  readonly aesthetics: DotAesthetics;
  readonly identity: powerbi.visuals.ISelectionId;
  readonly tooltip: powerbi.extensibility.VisualTooltipDataItem[];
};

export type DotText = {
  readonly text: string;
  readonly size: number;
  readonly font: string;
  readonly colour: string;
};

export type DotsOptions<P extends DotPoint> = {
  readonly frame: PlotFrame;
  readonly points: readonly P[];
  readonly show: boolean;
  /** Draws each point as this text instead of a marker */
  readonly text: ((point: P) => DotText) | undefined;
  readonly host: powerbi.extensibility.visual.IVisualHost;
  readonly selectionManager: powerbi.extensibility.ISelectionManager;
  readonly onSelectionChange: () => void;
  /** Replaces selection as the click action */
  readonly onClick: ((point: P) => void) | undefined;
};

const shapes: Record<string, SymbolType> = {
  Circle: symbolCircle,
  Cross: symbolCross,
  Diamond: symbolDiamond,
  Square: symbolSquare,
  Star: symbolStar,
  Triangle: symbolTriangle,
  Wye: symbolWye
};

/** Markers (or text) as direct children of the dots group; a point outside the frame is scaled away */
export function drawDots<P extends DotPoint>(svg: SVGSVGElement, options: DotsOptions<P>): void {
  const frame = options.frame;
  const host = options.host;
  const text = options.text;
  const group = select(svg).select<SVGGElement>(".dotsgroup");
  const textMode = text !== undefined;
  group.selectAll(textMode ? "path" : "text").remove();
  const marks = group
    .selectAll<SVGGraphicsElement, P>(textMode ? "text" : "path")
    .data(options.show && frame.displayPlot ? options.points : [])
    .join(textMode ? "text" : "path")
    .attr("transform", point => inPlot(frame, point.x, point.value)
      ? `translate(${frame.xScale(point.x)}, ${frame.yScale(point.value)})`
      : "translate(0, 0) scale(0)");
  if (text !== undefined) {
    marks
      .attr("dy", "0.35em")
      .text(point => text(point).text)
      .style("text-anchor", "middle")
      .style("font-size", point => `${text(point).size}px`)
      .style("font-family", point => text(point).font)
      .style("fill", point => text(point).colour);
  } else {
    marks
      // d3.symbol() takes size as area instead of radius
      .attr("d", point => symbol().type(shapes[point.aesthetics.shape]).size(point.aesthetics.size ** 2 * Math.PI)())
      .style("fill", point => point.aesthetics.colour)
      .style("stroke", point => point.aesthetics.colour_outline)
      .style("stroke-width", point => point.aesthetics.width_outline);
  }

  marks
    .on("click", (event: MouseEvent, point) => {
      if (!host.hostCapabilities.allowInteractions) {
        return;
      }
      if (options.onClick !== undefined) {
        options.onClick(point);
      } else {
        options.selectionManager.select(point.identity, event.ctrlKey || event.metaKey).then(options.onSelectionChange);
      }
      event.stopPropagation();
    })
    .on("mouseover", (event: MouseEvent, point) => {
      const pointer = screenToSvg(svg, event.clientX, event.clientY);
      host.tooltipService.show({
        dataItems: point.tooltip,
        identities: [point.identity],
        coordinates: [pointer.x, pointer.y],
        isTouchEvent: false
      });
    })
    .on("mouseout", () => {
      host.tooltipService.hide({ immediately: true, isTouchEvent: false });
    });

  select(svg).on("click.plot", () => {
    if (!host.hostCapabilities.allowInteractions) {
      return;
    }
    options.selectionManager.clear();
    options.onSelectionChange();
  });
}
