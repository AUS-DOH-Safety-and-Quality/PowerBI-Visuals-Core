import { select } from "d3-selection";

/** Builds the fixed layer order every renderer targets; clearing also drops the `.plot` handlers the dots bind */
export function initialiseSvg(svg: SVGSVGElement, removeAll: boolean = false): void {
  const selection = select(svg);
  if (removeAll) {
    selection.selectChildren().remove();
    selection.on(".plot", null);
  }
  selection.append("line").classed("ttip-line-x", true);
  selection.append("line").classed("ttip-line-y", true);
  selection.append("g").classed("gridgroup", true);
  selection.append("g").classed("xaxisgroup", true);
  selection.append("text").classed("xaxislabel", true);
  selection.append("g").classed("yaxisgroup", true);
  selection.append("text").classed("yaxislabel", true);
  selection.append("g").classed("linesgroup", true);
  selection.append("g").classed("dotsgroup", true);
}
