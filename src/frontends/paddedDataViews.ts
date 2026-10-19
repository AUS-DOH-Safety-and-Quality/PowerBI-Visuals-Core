import { frontendChart } from "./charts";
import { titleHeight, type TitleSettings } from "./chartTitle";
import type { InputSettings } from "./chartSettings";
import type { FrontendDataView } from "./updateValues";

/** Reserves room for the title, and for axis labels in static plots, without modifying the input */
export function paddedDataViews(chartType: string, dataViews: readonly FrontendDataView[], titleSettings: TitleSettings,
                                staticPlot: boolean): FrontendDataView[] {
  const defaults = frontendChart(chartType).defaultSettings;
  const titlePadding = titleHeight(titleSettings);
  const dataView = dataViews[0];
  const [key, ...indicators] = dataView.categorical.categories;
  const objects = new Array<InputSettings>(key.objects.length);
  for (let i = 0; i < objects.length; i++) {
    const settings = key.objects[i];
    const canvas = { ...defaults.canvas, ...settings.canvas };
    canvas.upper_padding = Number(canvas.upper_padding) + titlePadding;
    if (staticPlot) {
      const xAxis = { ...defaults.x_axis, ...settings.x_axis };
      const tickSize = Number(xAxis.xlimit_tick_size);
      const rotation = Number(xAxis.xlimit_tick_rotation);
      const radians = rotation * Math.PI / 180;
      canvas.left_padding = Number(canvas.left_padding) + 50;
      // Headless plots are not fitted to their overflowing axis labels. Rotated labels hang along their length,
      // taken as a dd/mm/yyyy date's 5em beyond their 0.8em offset, and across their 9px drop and height
      const lowerPadding = rotation === 0
        ? 10 + tickSize
        : 5.8 * tickSize * Math.abs(Math.sin(radians)) + (9 + 0.4 * tickSize) * Math.abs(Math.cos(radians));
      canvas.lower_padding = Number(canvas.lower_padding) + lowerPadding;
      // Centred tick labels overhang the last tick by half their width, labels rotated clockwise by their full width
      if (rotation >= 0) {
        canvas.right_padding = Number(canvas.right_padding) + (rotation > 0 ? 4 : 2) * tickSize;
      }
    }
    objects[i] = { ...settings, canvas };
  }
  return [{ ...dataView, categorical: { ...dataView.categorical, categories: [{ ...key, objects }, ...indicators] } }];
}
