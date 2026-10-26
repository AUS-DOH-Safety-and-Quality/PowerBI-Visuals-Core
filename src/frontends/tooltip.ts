import at from "../util/at";
import type powerbi from "powerbi-visuals-api";
import type { SvgSelection } from "../rendering/plotVisual";

type TooltipService = Pick<powerbi.extensibility.ITooltipService, "show" | "hide">;

type TooltipFontSettings = {
  readonly ttip_font_size: number;
  readonly ttip_font: string;
  readonly ttip_font_color: string;
} | {
  /** A stylesheet class whose font and colour the text inherits */
  readonly ttip_font_class: string;
};

export type TooltipSettings = TooltipFontSettings & {
  readonly ttip_background_color: string;
  readonly ttip_opacity: number;
  readonly ttip_border_radius: number;
  readonly ttip_border_color: string;
  readonly ttip_border_width: number;
};

// Keeps the 15px lines of a 12px font
const lineSpacing = 1.25;

export function showTooltip(svg: SvgSelection, settings: TooltipSettings, items: readonly powerbi.extensibility.VisualTooltipDataItem[],
                            coordinates: readonly number[]): void {
  const node = svg.node();
  if (node === null) {
    return;
  }
  const bounds = node.getBoundingClientRect();
  // Updates clear the SVG, so the group is (re)created on each show
  const tooltipGroup = svg.selectAll<SVGGElement, null>(".chart-tooltip-group").data([null]).join("g");
  tooltipGroup.raise();
  if ("ttip_font_class" in settings) {
    tooltipGroup.attr("class", `chart-tooltip-group ${settings.ttip_font_class}`).style("fill", "currentColor");
  } else {
    tooltipGroup.attr("class", "chart-tooltip-group")
      .style("font-size", `${settings.ttip_font_size}px`)
      .style("font-family", settings.ttip_font)
      .style("fill", settings.ttip_font_color);
  }
  const groupNode = tooltipGroup.node();
  if (groupNode === null) {
    return;
  }
  const lineHeight = parseFloat(getComputedStyle(groupNode).fontSize) * lineSpacing;
  const rect = tooltipGroup.selectAll("rect").data([0]).join("rect");
  const texts = tooltipGroup.selectAll<SVGTextElement, unknown>("text")
    .data(items)
    .join("text")
    .attr("x", 5)
    .attr("y", (_, i) => lineHeight + lineHeight * i)
    .text(d => `${d.displayName}: ${d.value}`)
    .style("text-anchor", "left")
    .nodes();
  let maxTextLength = 0;
  for (let i = 0; i < texts.length; i++) {
    maxTextLength = Math.max(maxTextLength, at(texts, i).getComputedTextLength());
  }
  let left = at(coordinates, 0);
  let top = at(coordinates, 1);
  // Keep the tooltip within the right and bottom edges
  if (left + maxTextLength > bounds.width) {
    left = left - maxTextLength - 10;
  }
  if (top + lineHeight * items.length > bounds.height) {
    top = top - lineHeight * items.length - 5;
  }
  rect.attr("fill", settings.ttip_background_color)
    .attr("stroke", settings.ttip_border_color)
    .attr("stroke-width", settings.ttip_border_width)
    .attr("opacity", settings.ttip_opacity)
    .attr("rx", settings.ttip_border_radius)
    .attr("ry", settings.ttip_border_radius)
    .attr("x", 0)
    .attr("y", 0)
    .attr("width", maxTextLength + 10)
    .attr("height", lineHeight * items.length + 5);
  tooltipGroup.attr("transform", `translate(${left}, ${top})`);
}

export function hideTooltip(svg: SvgSelection): void {
  svg.select(".chart-tooltip-group").selectChildren().remove();
}

/** Draws tooltips in the visual's SVG; both are read on show, as the visual is constructed with the service */
export function svgTooltipService(svg: () => SvgSelection, settings: () => TooltipSettings | undefined): TooltipService {
  return {
    show: options => {
      const current = settings();
      if (current !== undefined) {
        showTooltip(svg(), current, options.dataItems, options.coordinates);
      }
    },
    hide: () => {
      hideTooltip(svg());
    }
  };
}
