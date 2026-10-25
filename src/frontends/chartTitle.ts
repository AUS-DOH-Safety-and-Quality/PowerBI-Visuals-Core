import at from "../util/at";
import type { SvgSelection } from "../rendering/plotVisual";
import { hasOwn, isPlainObject } from "./values";

type TitleValue = string | number;

export type TitleSettings = {
  text: TitleValue | null;
  font_size: TitleValue;
  font_weight: TitleValue;
  font_family: TitleValue;
  x: TitleValue;
  y: TitleValue;
  text_anchor: TitleValue;
  dominant_baseline: TitleValue;
  subtitle: TitleValue | null;
  subtitle_font_size: TitleValue;
  subtitle_font_weight: TitleValue;
};

const defaultTitleSettings: Readonly<TitleSettings> = {
  text: null,
  font_size: "16px",
  font_weight: "bold",
  font_family: "'Arial', sans-serif",
  x: "50%",
  y: 5,
  text_anchor: "middle",
  dominant_baseline: "hanging",
  subtitle: null,
  subtitle_font_size: "12px",
  subtitle_font_weight: "normal"
};

function isTitleName(name: string): name is keyof TitleSettings {
  return hasOwn(defaultTitleSettings, name);
}

/** A title, or named title settings over the defaults */
export function chartTitle(title: unknown): { settings: TitleSettings } | { error: string } {
  const settings: TitleSettings = { ...defaultTitleSettings };
  if (typeof title === "string") {
    settings.text = title;
    return { settings };
  }
  let valid = title == null || isPlainObject(title);
  const named = isPlainObject(title) ? title : {};
  const names = Object.keys(named);
  for (let i = 0; i < names.length && valid; i++) {
    const name = at(names, i);
    const value = named[name];
    if (!isTitleName(name) || (value != null && typeof value !== "string" && typeof value !== "number")) {
      valid = false;
    } else if (value != null) {
      settings[name] = value;
    }
  }
  if (!valid) {
    const options = Object.keys(defaultTitleSettings).join("', '");
    return { error: `The title must be a string, or named settings from: '${options}'.` };
  }
  return { settings };
}

/** The height the title and subtitle take above the plot */
export function titleHeight(settings: TitleSettings): number {
  if (settings.text === null) {
    return 0;
  }
  let height = parseFloat(String(settings.font_size)) + Number(settings.y);
  if (settings.subtitle !== null) {
    height += parseFloat(String(settings.subtitle_font_size));
  }
  return height;
}

export function updateChartTitle(svg: SvgSelection, settings: TitleSettings): void {
  svg.selectAll(".chart-title, .chart-subtitle").remove();
  if (settings.text === null) {
    return;
  }
  svg.append("text")
    .classed("chart-title", true)
    .attr("x", settings.x)
    .attr("y", settings.y)
    .attr("text-anchor", settings.text_anchor)
    .attr("dominant-baseline", settings.dominant_baseline)
    .attr("font-size", settings.font_size)
    .attr("font-weight", settings.font_weight)
    .attr("font-family", settings.font_family)
    .text(settings.text);
  if (settings.subtitle !== null) {
    svg.append("text")
      .classed("chart-subtitle", true)
      .attr("x", settings.x)
      .attr("y", Number(settings.y) + parseFloat(String(settings.font_size)))
      .attr("text-anchor", settings.text_anchor)
      .attr("dominant-baseline", settings.dominant_baseline)
      .attr("font-size", settings.subtitle_font_size)
      .attr("font-weight", settings.subtitle_font_weight)
      .attr("font-family", settings.font_family)
      .text(settings.subtitle);
  }
}
