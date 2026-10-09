export type OutlierStatus = "lower" | "upper" | "none";
export type FlagDirection = "none" | "improvement" | "deterioration" | "neutral_low" | "neutral_high";
export type ImprovementDirection = "increase" | "decrease" | "neutral";
export type FlagType = "both" | "improvement" | "deterioration";
export type FlagSettings = {
  readonly process_flag_type: FlagType;
  readonly improvement_direction: ImprovementDirection;
};

const directionMaps: Record<ImprovementDirection, Record<"lower" | "upper", FlagDirection>> = {
  increase: { upper: "improvement", lower: "deterioration" },
  decrease: { lower: "improvement", upper: "deterioration" },
  neutral: { lower: "neutral_low", upper: "neutral_high" }
};

/** Maps which limit was crossed to a change type, then filters by the type the user wants flagged */
export default function checkFlagDirection(outlierStatus: OutlierStatus, flagSettings: FlagSettings): FlagDirection {
  if (outlierStatus === "none") {
    return "none";
  }
  const mappedFlag = directionMaps[flagSettings.improvement_direction][outlierStatus];
  if (flagSettings.process_flag_type !== "both" && mappedFlag !== flagSettings.process_flag_type) {
    return "none";
  }
  return mappedFlag;
}
