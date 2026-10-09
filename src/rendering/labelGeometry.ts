import isValidNumber from "../data/isValidNumber";

export type LabelAesthetics = {
  readonly label_position: "top" | "bottom";
  readonly label_y_offset: number;
  readonly label_line_offset: number;
  readonly label_angle_offset: number;
  readonly label_font: string;
  readonly label_size: number;
  readonly label_colour: string;
  readonly label_line_max_length: number;
  readonly label_marker_show: boolean;
  readonly label_marker_offset: number;
  readonly label_marker_size: number;
  readonly label_marker_colour: string;
  readonly label_marker_outline_colour: string;
};

// angle/distance are owned by the point and mutated while dragging
export type LabelState = {
  readonly text_value: string | undefined;
  readonly aesthetics: LabelAesthetics;
  angle: number | undefined;
  distance: number | undefined;
};

export type LabelPoint = {
  readonly x: number;
  readonly value: number;
  readonly label: LabelState;
};

export type LabelGeometry = {
  readonly x: number;
  readonly y: number;
  readonly theta: number;
  readonly line_offset: number;
  readonly marker_offset: number;
};

// Returns undefined when the position is not finite; any finite position, including the origin, renders
export function labelGeometry(label: LabelState, pointX: number, pointY: number,
                              plotHeight: number, bottomPadding: number): LabelGeometry | undefined {
  const aesthetics = label.aesthetics;
  const top = aesthetics.label_position === "top";
  const label_direction_mult = top ? -1 : 1;
  const xAxisHeight = plotHeight - bottomPadding;
  const y_offset = aesthetics.label_y_offset;
  const label_initial = top ? (0 + y_offset) : (xAxisHeight - y_offset);
  let side_length = top ? (pointY - label_initial) : (label_initial - pointY);

  const theta = label.angle ?? (aesthetics.label_angle_offset + label_direction_mult * 90);
  side_length = label.distance ?? (Math.min(side_length, aesthetics.label_line_max_length));

  let line_offset = aesthetics.label_line_offset;
  line_offset = top ? line_offset : -(line_offset + aesthetics.label_size / 2);

  let marker_offset = aesthetics.label_marker_offset + aesthetics.label_size / 2;
  marker_offset = top ? -marker_offset : marker_offset;

  const x = pointX + side_length * Math.cos(theta * Math.PI / 180);
  const y = pointY + side_length * Math.sin(theta * Math.PI / 180);

  if (!isValidNumber(x) || !isValidNumber(y)) return undefined;
  return { x, y, theta, line_offset, marker_offset };
}
