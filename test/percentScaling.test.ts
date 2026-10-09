import { describe, expect, it } from "vitest";
import { resolvePercentScaling } from "../src/data/index.js";

describe("percent scaling", () => {
  it.each([
    [true, "Automatic", 1, 100, true],
    [true, "Automatic", 10, 10, false],
    [true, "Yes", 1, 100, true],
    [true, "Yes", 10, 100, true],
    [true, "No", 1, 1, false],
    [false, "Automatic", 1, 1, false],
    [false, "Automatic", 100, 100, false],
    [false, "Yes", 1, 100, true],
    [false, "No", 100, 100, false]
  ] as const)("proportion %s with %s and multiplier %s gives multiplier %s and labels %s", (isProportion, setting, multiplier, expectedMultiplier, expectedLabels) => {
    expect(resolvePercentScaling(isProportion, setting, multiplier)).toEqual({ multiplier: expectedMultiplier, percentLabels: expectedLabels });
  });
});
