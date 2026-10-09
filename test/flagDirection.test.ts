import { describe, expect, it } from "vitest";
import { checkFlagDirection } from "../src/data/index";

describe("flag direction", () => {
  it("returns none for a non-outlier whatever the settings", () => {
    expect(checkFlagDirection("none", { process_flag_type: "both", improvement_direction: "increase" })).toBe("none");
    expect(checkFlagDirection("none", { process_flag_type: "improvement", improvement_direction: "decrease" })).toBe("none");
    expect(checkFlagDirection("none", { process_flag_type: "deterioration", improvement_direction: "neutral" })).toBe("none");
  });

  it.each([
    ["increase", "upper", "improvement"],
    ["increase", "lower", "deterioration"],
    ["decrease", "lower", "improvement"],
    ["decrease", "upper", "deterioration"],
    ["neutral", "lower", "neutral_low"],
    ["neutral", "upper", "neutral_high"]
  ] as const)("maps %s direction with %s outlier to %s when both are flagged", (direction, status, expected) => {
    expect(checkFlagDirection(status, { process_flag_type: "both", improvement_direction: direction })).toBe(expected);
  });

  it.each([
    ["improvement", "increase", "upper", "improvement"],
    ["improvement", "increase", "lower", "none"],
    ["deterioration", "increase", "lower", "deterioration"],
    ["deterioration", "increase", "upper", "none"],
    ["improvement", "decrease", "lower", "improvement"],
    ["improvement", "decrease", "upper", "none"],
    ["deterioration", "decrease", "upper", "deterioration"],
    ["deterioration", "decrease", "lower", "none"],
    ["improvement", "neutral", "upper", "none"],
    ["deterioration", "neutral", "lower", "none"]
  ] as const)("flagging only %s with %s direction and %s outlier gives %s", (type, direction, status, expected) => {
    expect(checkFlagDirection(status, { process_flag_type: type, improvement_direction: direction })).toBe(expected);
  });
});
