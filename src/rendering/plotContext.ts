import type powerbi from "powerbi-visuals-api";
import type { AxisPalette } from "./axisProperties";
import type { DotPoint } from "./drawDots";
import type { LabelPoint } from "./labelGeometry";
import type { PlotFrame } from "./plotFrame";

export type PlotPoint = DotPoint & LabelPoint;

export type PlotSettings = {
  readonly x_axis: { readonly xlimit_show: boolean; readonly xlimit_label_size: number };
  readonly y_axis: { readonly ylimit_show: boolean; readonly ylimit_label_size: number };
  readonly labels: {
    readonly show_labels: boolean;
    readonly label_line_colour: string;
    readonly label_line_width: number;
    readonly label_line_type: string;
  };
  readonly download_options: { readonly show_button: boolean };
};

// What the plot renderers read from a visual for one draw
export type PlotContext<P extends PlotPoint = PlotPoint> = {
  readonly frame: PlotFrame;
  readonly points: readonly P[];
  readonly palette: AxisPalette;
  readonly settings: PlotSettings;
  readonly host: powerbi.extensibility.visual.IVisualHost;
  readonly selectionManager: powerbi.extensibility.ISelectionManager;
  readonly onSelectionChange: () => void;
  readonly headless: boolean;
  readonly frontend: boolean;
};
