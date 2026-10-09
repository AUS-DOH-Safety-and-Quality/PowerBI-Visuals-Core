import { axisBottom, axisLeft, type Axis } from "d3-axis";
import { select } from "d3-selection";
import { drawGridlines, axisLabelPlacement, xTickLabelOffsets, axisTitleOffset, measureAxisEdge } from "./axis";
import type { PlotFrame } from "./plotFrame";

export type AxisDrawOptions = {
  readonly axis: "x" | "y";
  readonly frame: PlotFrame;
  readonly show: boolean;
  readonly tickFormat: ((value: number) => string) | undefined;
  // Unscaled title size; places the title when the axis cannot be measured
  readonly labelSize: number;
  readonly measure: boolean;
};

const HIDDEN = "#FFFFFF";

// Draws one axis with its gridlines and title beneath the lines; a hidden axis is removed entirely
export function drawAxis(svg: SVGSVGElement, options: AxisDrawOptions): void {
  const { axis, frame } = options;
  const selection = select(svg);
  const existingGroup = selection.select<SVGGElement>(`.${axis}axisgroup`);
  const existingLabel = selection.select<SVGTextElement>(`.${axis}axislabel`);
  if (!options.show) {
    existingGroup.remove();
    existingLabel.remove();
    selection.selectAll(`.${axis}gridline`).remove();
    return;
  }
  const group = existingGroup.empty()
    ? selection.insert<SVGGElement>("g", ".linesgroup").classed(`${axis}axisgroup`, true)
    : existingGroup;
  const label = existingLabel.empty()
    ? selection.insert<SVGTextElement>("text", ".linesgroup").classed(`${axis}axislabel`, true)
    : existingLabel;

  const isX = axis === "x";
  const properties = isX ? frame.xAxis : frame.yAxis;
  const scale = isX ? frame.xScale : frame.yScale;
  const generator: Axis<number> = isX ? axisBottom(scale) : axisLeft(scale);
  generator.tickSizeOuter(properties.tick_marks ? 6 : 0);
  if (properties.ticks) {
    if (properties.tick_count) {
      generator.ticks(properties.tick_count);
    }
    if (options.tickFormat !== undefined) {
      generator.tickFormat(options.tickFormat);
    }
  } else {
    generator.tickValues([]);
  }

  const colour = (value: string): string => frame.displayPlot ? value : HIDDEN;
  // The axis line sits on the bottom padding edge for x and the left for y
  const edge = isX ? frame.height - frame.yAxis.start_padding : frame.xAxis.start_padding;
  const tickText = group
    .call(generator)
    .attr("color", colour(properties.colour))
    .attr("transform", isX ? `translate(0, ${edge})` : `translate(${edge}, 0)`)
    .selectAll(".tick text")
    .attr("transform", `rotate(${properties.tick_rotation})`)
    .style("font-size", properties.tick_size)
    .style("font-family", properties.tick_font)
    .style("fill", colour(properties.tick_colour));
  if (isX) {
    const offset = xTickLabelOffsets(properties.tick_rotation);
    tickText.style("text-anchor", offset.anchor).attr("dx", offset.dx).attr("dy", offset.dy);
  }
  group.selectAll(".tick line").style("stroke", properties.tick_marks ? "currentColor" : "none");

  const gridGroup = svg.querySelector<SVGGElement>(".gridgroup");
  if (gridGroup !== null) {
    drawGridlines({
      container: gridGroup, className: `${axis}gridline`, orientation: isX ? "vertical" : "horizontal",
      values: properties.grid_show ? group.selectAll<SVGGElement, number>(".tick").data() : [],
      scale,
      from: isX ? edge : frame.xAxis.start_padding,
      to: isX ? frame.yAxis.end_padding : frame.width - frame.xAxis.end_padding,
      colour: colour(properties.grid_colour),
      width: properties.grid_width
    });
  }

  const placement = isX
    ? axisLabelPlacement(properties.label_align, frame.xAxis.start_padding, frame.width - frame.xAxis.end_padding)
    : axisLabelPlacement(properties.label_align, frame.height - frame.yAxis.start_padding, frame.yAxis.end_padding);
  const groupNode = group.node();
  const measured = options.measure && groupNode !== null ? measureAxisEdge(svg, groupNode, isX ? "bottom" : "left") : undefined;
  const offset = axisTitleOffset(isX ? "bottom" : "left", isX ? frame.height : frame.width, measured, options.labelSize);
  label
    .attr("x", isX ? placement.position : offset)
    .attr("y", isX ? offset : placement.position)
    .attr("transform", isX ? null : `rotate(-90, ${offset}, ${placement.position})`)
    .text(properties.label)
    .style("text-anchor", placement.anchor)
    .style("font-size", properties.label_size)
    .style("font-style", properties.label_style)
    .style("font-family", properties.label_font)
    .style("fill", colour(properties.label_colour));
}
