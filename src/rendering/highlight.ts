import { select } from "d3-selection";
import { identitySelected, type SelectionKeyed } from "../powerbi/selection";
import type { PlotLine } from "./drawLines";

export type HighlightOpacities = {
  readonly opacity: number;
  readonly opacity_selected: number;
  readonly opacity_unselected: number;
};

export type HighlightPoint = {
  readonly identity: SelectionKeyed | readonly SelectionKeyed[];
  readonly highlighted: boolean;
};

export type PlotHighlightOptions<P extends HighlightPoint> = {
  readonly active: boolean;
  readonly selected: ReadonlySet<string>;
  readonly lineOpacity: (line: PlotLine) => number;
  // The opacities a dot fades between, which depend on how the visual drew it
  readonly dotOpacities: (point: P) => HighlightOpacities;
};

// Default opacity until a selection or highlight is active, then selected or unselected
export function highlightOpacity(opacities: HighlightOpacities, active: boolean, emphasised: boolean): number {
  if (!active) {
    return opacities.opacity;
  }
  return emphasised ? opacities.opacity_selected : opacities.opacity_unselected;
}

// Line groups take their settings' opacity; dots fade unless selected or host-highlighted
export function highlightPlot<P extends HighlightPoint>(svg: SVGSVGElement, options: PlotHighlightOptions<P>): void {
  const root = select(svg);
  root.selectAll(".linesgroup").selectChildren<SVGGElement, PlotLine>("g").style("stroke-opacity", options.lineOpacity);
  const dotOpacity = (point: P): number =>
    highlightOpacity(options.dotOpacities(point), options.active, identitySelected(point.identity, options.selected) || point.highlighted);
  root.selectAll(".dotsgroup").selectChildren<SVGGraphicsElement, P>()
    .style("fill-opacity", dotOpacity)
    .style("stroke-opacity", dotOpacity);
}
