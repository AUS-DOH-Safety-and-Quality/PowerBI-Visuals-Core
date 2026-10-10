import { colourOption, dropdownOption, numberOption, textOption, toggleOption } from "./definitions";

/** Marker appearance and the opacities a selection applies */
export function dotOptions() {
  return {
    shape: dropdownOption("Shape", "Marker shape for each point.", "Circle",
                          ["Circle", "Cross", "Diamond", "Square", "Star", "Triangle", "Wye"]),
    size: numberOption("Size", "Size of each point; a circle's radius in pixels.", 2.5, { min: 0, max: 100 }),
    colour: colourOption("Colour", "Fill colour of each point.", "common_cause"),
    colour_outline: colourOption("Outline Colour", "Outline colour of each point.", "common_cause"),
    width_outline: numberOption("Outline Width", "Outline width of each point, in pixels.", 1, { min: 0, max: 100 }),
    opacity: numberOption("Default Opacity", "Point opacity while nothing is selected.", 1, { min: 0, max: 1 }),
    opacity_selected: numberOption("Opacity if Selected",
                                   "Opacity of selected or highlighted points while a selection is active.", 1, { min: 0, max: 1 }),
    opacity_unselected: numberOption("Opacity if Unselected",
                                     "Opacity of the other points while a selection is active.", 0.2, { min: 0, max: 1 })
  };
}

/** Which flagged changes count, and which direction is an improvement */
export function flagDirectionOptions() {
  return {
    process_flag_type: dropdownOption("Type of Change to Flag",
                                      "Which changes are flagged. Ignored when the improvement direction is neutral.",
                                      "both", ["both", "improvement", "deterioration"], "sentence"),
    improvement_direction: dropdownOption("Improvement Direction",
                                          "Whether higher or lower values are better. Neutral flags both sides in the neutral colours.",
                                          "increase", ["increase", "neutral", "decrease"], "sentence")
  };
}

export function scalingOptions() {
  return {
    multiplier: numberOption("Multiplier", "Multiplies plotted values and limits, e.g. 1000 for a rate per 1,000.", 1, { min: 0 }),
    sig_figs: numberOption("Decimals to Report:",
                           "Decimal places for values in tooltips, line labels and the y-axis, unless the y-axis sets its own.",
                           2, { min: 0, max: 20, integer: true }),
    perc_labels: dropdownOption("Report as percentage",
                                "Yes multiplies by 100 and adds a % sign, replacing the multiplier. Automatic does this for "
                                + "proportion charts with a multiplier of 1 or 100. No never adds a % sign.",
                                "Automatic", ["Automatic", "Yes", "No"])
  };
}

export function valueTooltipOptions() {
  return {
    ttip_show_numerator: toggleOption("Show Numerator in Tooltip", "Shows the numerator in the tooltip, when one is supplied.", true),
    ttip_label_numerator: textOption("Numerator Tooltip Label", "Name for the numerator in the tooltip.", "Numerator"),
    ttip_show_denominator: toggleOption("Show Denominator in Tooltip", "Shows the denominator in the tooltip, when one is supplied.", true),
    ttip_label_denominator: textOption("Denominator Tooltip Label", "Name for the denominator in the tooltip.", "Denominator"),
    ttip_show_value: toggleOption("Show Value in Tooltip", "Shows the plotted value in the tooltip.", true),
    ttip_label_value: textOption("Value Tooltip Label",
                                 "Name for the plotted value in the tooltip; Automatic names it after the chart type.", "Automatic")
  };
}

export function limitTruncationOptions() {
  return {
    ll_truncate: numberOption("Truncate Lower Limits at:",
                              "Limits below this plotted value are drawn at it, and points are flagged against them.", undefined),
    ul_truncate: numberOption("Truncate Upper Limits at:",
                              "Limits above this plotted value are drawn at it, and points are flagged against them.", undefined)
  };
}
