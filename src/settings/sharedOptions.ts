import { colourOption, dropdownOption, numberOption, textOption, toggleOption } from "./definitions";

/** Marker appearance and the opacities a selection applies */
export function dotOptions() {
  return {
    shape: dropdownOption("Shape", "Circle", ["Circle", "Cross", "Diamond", "Square", "Star", "Triangle", "Wye"]),
    size: numberOption("Size", 2.5, { min: 0, max: 100 }),
    colour: colourOption("Colour", "common_cause"),
    colour_outline: colourOption("Outline Colour", "common_cause"),
    width_outline: numberOption("Outline Width", 1, { min: 0, max: 100 }),
    opacity: numberOption("Default Opacity", 1, { min: 0, max: 1 }),
    opacity_selected: numberOption("Opacity if Selected", 1, { min: 0, max: 1 }),
    opacity_unselected: numberOption("Opacity if Unselected", 0.2, { min: 0, max: 1 })
  };
}

/** Which flagged changes count, and which direction is an improvement */
export function flagDirectionOptions() {
  return {
    process_flag_type: dropdownOption("Type of Change to Flag", "both", ["both", "improvement", "deterioration"], "sentence"),
    improvement_direction: dropdownOption("Improvement Direction", "increase", ["increase", "neutral", "decrease"], "sentence")
  };
}

export function scalingOptions() {
  return {
    multiplier: numberOption("Multiplier", 1, { min: 0 }),
    sig_figs: numberOption("Decimals to Report:", 2, { min: 0, max: 20 }),
    perc_labels: dropdownOption("Report as percentage", "Automatic", ["Automatic", "Yes", "No"])
  };
}

export function valueTooltipOptions() {
  return {
    ttip_show_numerator: toggleOption("Show Numerator in Tooltip", true),
    ttip_label_numerator: textOption("Numerator Tooltip Label", "Numerator"),
    ttip_show_denominator: toggleOption("Show Denominator in Tooltip", true),
    ttip_label_denominator: textOption("Denominator Tooltip Label", "Denominator"),
    ttip_show_value: toggleOption("Show Value in Tooltip", true),
    ttip_label_value: textOption("Value Tooltip Label", "Automatic")
  };
}

export function limitTruncationOptions() {
  return {
    ll_truncate: numberOption("Truncate Lower Limits at:", undefined),
    ul_truncate: numberOption("Truncate Upper Limits at:", undefined)
  };
}
