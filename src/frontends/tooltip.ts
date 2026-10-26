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

// Power BI's tooltip spacing, in multiples of the font size
const lineEms = 1.4;
const paddingEms = 1.1;
const gapEms = 1;

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
  const fontSize = parseFloat(getComputedStyle(groupNode).fontSize);
  const lineHeight = fontSize * lineEms;
  const padding = fontSize * paddingEms;
  const gap = fontSize * gapEms;
  const rect = tooltipGroup.selectAll("rect").data([0]).join("rect");
  // Power BI's layout: names right-aligned against left-aligned values, each centred in its line
  const names = tooltipGroup.selectAll<SVGTextElement, unknown>(".chart-tooltip-name")
    .data(items)
    .join("text")
    .attr("class", "chart-tooltip-name")
    .attr("y", (_, i) => padding + lineHeight * (i + 0.5))
    .text(d => d.displayName)
    .style("text-anchor", "end")
    .style("dominant-baseline", "central");
  const values = tooltipGroup.selectAll<SVGTextElement, unknown>(".chart-tooltip-value")
    .data(items)
    .join("text")
    .attr("class", "chart-tooltip-value")
    .attr("y", (_, i) => padding + lineHeight * (i + 0.5))
    .text(d => d.value)
    .style("text-anchor", "start")
    .style("dominant-baseline", "central");
  const nameNodes = names.nodes();
  const valueNodes = values.nodes();
  let nameWidth = 0;
  let valueWidth = 0;
  for (let i = 0; i < nameNodes.length; i++) {
    nameWidth = Math.max(nameWidth, at(nameNodes, i).getComputedTextLength());
    valueWidth = Math.max(valueWidth, at(valueNodes, i).getComputedTextLength());
  }
  names.attr("x", padding + nameWidth);
  values.attr("x", padding + nameWidth + gap);
  const width = padding + nameWidth + gap + valueWidth + padding;
  const height = padding + lineHeight * items.length + padding;
  let left = at(coordinates, 0);
  let top = at(coordinates, 1);
  // Keep the tooltip within the right and bottom edges
  if (left + width > bounds.width) {
    left = left - width;
  }
  if (top + height > bounds.height) {
    top = top - height;
  }
  rect.attr("fill", settings.ttip_background_color)
    .attr("stroke", settings.ttip_border_color)
    .attr("stroke-width", settings.ttip_border_width)
    .attr("opacity", settings.ttip_opacity)
    .attr("rx", settings.ttip_border_radius)
    .attr("ry", settings.ttip_border_radius)
    .attr("x", 0)
    .attr("y", 0)
    .attr("width", width)
    .attr("height", height);
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
