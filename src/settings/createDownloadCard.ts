import { defineCard, toggleOption } from "./definitions";

export default function createDownloadCard() {
  return defineCard({
    description: "Download Options",
    displayName: "Download Options",
    settingsGroups: {
      "all": {
        show_button: toggleOption("Show Download Button", "Shows a button that exports the plotted data as chartdata.csv.", false)
      }
    }
  });
}
