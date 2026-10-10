import { defineCard, paddingOption, toggleOption } from "./definitions";

export default function createCanvasCard() {
  return defineCard({
    description: "Canvas Settings",
    displayName: "Canvas Settings",
    settingsGroups: {
      "all": {
        show_errors: toggleOption("Show Errors on Canvas", "Writes data and settings errors on the visual; off leaves it blank.", true),
        lower_padding: paddingOption("Padding Below Plot (pixels):", "Space below the plot area, in addition to the x-axis title."),
        upper_padding: paddingOption("Padding Above Plot (pixels):", "Space above the plot area."),
        left_padding: paddingOption("Padding Left of Plot (pixels):", "Space left of the plot area, in addition to the y-axis title."),
        right_padding: paddingOption("Padding Right of Plot (pixels):", "Space right of the plot area.")
      }
    }
  });
}
