import { defineCard,
  fontOption, toggleOption,
  colourOption, fontSizeOption, lineTypeOption,
  numberOption, dropdownOption
 } from "./definitions";

export default function createLabelsCard() {
  return defineCard({
    description: "Labels Settings",
    displayName: "Labels Settings",
    settingsGroups: {
      "all": {
        show_labels: toggleOption("Show Value Labels", "Draws the Value Labels field's text, joined to its point by a line.", true),
        label_position: dropdownOption("Label Position", "Whether labels sit above or below their points.", "top", ["top", "bottom"], "sentence"),
        label_y_offset: numberOption("Label Offset from Top/Bottom (px)",
                                     "Distance of the labels from the top of the plot, or from the x-axis when below.", 20),
        label_line_offset: numberOption("Label Offset from Connecting Line (px)", "Gap between the label text and its line.", 5),
        label_angle_offset: numberOption("Label Angle Offset (degrees)", "Tilts the connecting line away from vertical.", 0, { min: -90, max: 90 }),
        label_font: fontOption("Label Font", "Font of the labels."),
        label_size: fontSizeOption("Label Font Size", "Font size of the labels, in pixels."),
        label_colour: colourOption("Label Font Colour", "Colour of the labels.", "standard"),
        label_line_colour: colourOption("Connecting Line Colour", "Colour of the line from label to point.", "standard"),
        label_line_width: numberOption("Connecting Line Width", "Width of the line from label to point, in pixels.", 1, { min: 0, max: 100 }),
        label_line_type: lineTypeOption("Connecting Line Type", "Dash pattern of the line from label to point.", "10 0"),
        label_line_max_length: numberOption("Max Connecting Line Length (px)", "Longest the line from label to point can be.",
                                            1000, { min: 0, max: 10000 }),
        label_marker_show: toggleOption("Show Line Markers", "Draws a triangle where the line meets the point.", true),
        label_marker_offset: numberOption("Marker Offset from Value (px)", "Gap between the point and the triangle.", 5),
        label_marker_size: numberOption("Marker Size", "Size of the triangle.", 3, { min: 0, max: 100 }),
        label_marker_colour: colourOption("Marker Fill Colour", "Fill colour of the triangle.", "standard"),
        label_marker_outline_colour: colourOption("Marker Outline Colour", "Outline colour of the triangle.", "standard")
      }
    }
  });
}
