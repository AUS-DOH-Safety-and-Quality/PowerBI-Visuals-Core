export type PercentScaling = {
  readonly multiplier: number;
  readonly percentLabels: boolean;
};

/** "Yes" forces a 100 multiplier; proportions default to 100 unless "No"; "Automatic" labels only a 100-scaled proportion */
export default function resolvePercentScaling(isProportion: boolean, percentSetting: string, multiplier: number): PercentScaling {
  if (percentSetting === "Yes") {
    multiplier = 100;
  }
  if (isProportion && percentSetting !== "No" && multiplier === 1) {
    multiplier = 100;
  }
  const percentLabels = percentSetting === "Automatic" ? isProportion && multiplier === 100 : percentSetting === "Yes";
  return { multiplier, percentLabels };
}
