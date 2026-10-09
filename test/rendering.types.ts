import { drawValueLabels, labelGeometry, type LabelPoint, type ValueLabelOptions } from "../src/rendering/index";

type LocalPoint = {
  x: number;
  value: number;
  extra: string;
  label: {
    text_value: string;
    aesthetics: {
      label_position: "top" | "bottom"; label_y_offset: number; label_line_offset: number; label_angle_offset: number;
      label_font: string; label_size: number; label_colour: string; label_line_max_length: number;
      label_marker_show: boolean; label_marker_offset: number; label_marker_size: number;
      label_marker_colour: string; label_marker_outline_colour: string;
      show_labels: boolean;
    };
    angle: number | undefined;
    distance: number | undefined;
    line_offset: number | undefined;
    marker_offset: number | undefined;
  };
};

declare const local: LocalPoint[];
declare const svg: SVGSVGElement;
// A local point type with extra properties satisfies the structural contract without copying.
const points: readonly LabelPoint[] = local;
labelGeometry(local[0].label, 0, 0, 100, 10);

const options: ValueLabelOptions = {
  visible: true, points, xScale: x => x, yScale: v => v, plotHeight: 100, bottomPadding: 10,
  line: { colour: "#000", width: 1, type: "10 0" }, interactive: false
};
drawValueLabels(svg, options);

// @ts-expect-error Interaction state must be stated explicitly.
const missing: ValueLabelOptions = { visible: true, points, xScale: x => x, yScale: v => v, plotHeight: 100, bottomPadding: 10, line: { colour: "#000", width: 1, type: "10 0" } };
missing.visible;

// @ts-expect-error Label placement is a literal choice, not any string.
const loose: LabelPoint = { x: 0, value: 0, label: { text_value: "A", angle: undefined, distance: undefined, aesthetics: { ...local[0].label.aesthetics, label_position: "left" } } };
loose.x;

import { drawLineLabels, drawErrorMessage, drawCrosshairs, type LineLabel, type ErrorMessageOptions } from "../src/rendering/index";

declare const group: SVGGElement;
declare const lineElement: SVGLineElement;
const lineLabel: LineLabel = {
  text: "1.5", x: 10, y: 20, position: "outside", lower: true, hpad: 2, vpad: 3, lineWidth: 1, size: 10,
  font: "Arial", colour: "#000"
};
drawLineLabels(group, [lineLabel]);

// @ts-expect-error Boundary side must be stated so outside/inside can be resolved.
const unsided: LineLabel = { text: "1", x: 0, y: 0, position: "above", hpad: 0, vpad: 0, lineWidth: 0, size: 1, font: "a", colour: "b" };
unsided.x;

// @ts-expect-error Position is a literal choice, not any string.
const loosePosition: LineLabel = { ...lineLabel, position: "left" };
loosePosition.x;

const error: ErrorMessageOptions = { width: 100, height: 50, message: "m", kind: undefined, colour: "#000" };
drawErrorMessage(svg, error);

// @ts-expect-error Unknown error kinds have no preamble.
const looseKind: ErrorMessageOptions = { ...error, kind: "other" };
looseKind.kind;

// @ts-expect-error The kind must be stated, even when absent.
const missingKind: ErrorMessageOptions = { width: 100, height: 50, message: "m", colour: "#000" };
missingKind.kind;

const crosshairs = drawCrosshairs({ vertical: lineElement, horizontal: lineElement, left: 0, right: 10, top: 0, bottom: 10, colour: "#000" });
crosshairs.show(1, 2);
crosshairs.hide();

import { drawGridlines, axisLabelPlacement, type AxisLabelAlign } from "../src/rendering/index";

declare const align: AxisLabelAlign;
const anchor: "start" | "middle" | "end" = axisLabelPlacement(align, 0, 100).anchor;
void anchor;
drawGridlines({ container: group, className: "xgridline", orientation: "vertical", values: [1, 2], scale: v => v, from: 0, to: 10, colour: "#000", width: 1 });

// @ts-expect-error Alignment is a literal choice, not any string.
axisLabelPlacement("middle", 0, 100);
