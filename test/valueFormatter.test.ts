import { describe, expect, it } from "vitest";
import { createValueFormatter } from "../src/data/index";

describe("value formatter", () => {
  it("applies decimal places and suffix to values, and decimal places without suffix to non-integral input data", () => {
    const format = createValueFormatter(2, "%");
    expect(format(12.625, "value")).toBe("12.63%");
    expect(format(12.625, "input")).toBe("12.63");
    expect(format(undefined, "value")).toBe("");
  });

  it("writes integral input data without decimals, and other input data with the decimal places", () => {
    const format = createValueFormatter(3, "%");
    expect(format(12, "input")).toBe("12");
    expect(format(0, "input")).toBe("0");
    expect(format(-0, "input")).toBe("0");
    expect(format(-3, "input")).toBe("-3");
    expect(format(1234567, "input")).toBe("1234567");
    expect(format(12.5, "input")).toBe("12.500");
    expect(format(-0.0001, "input")).toBe("0.000");
    expect(format(Number.NaN, "input")).toBe("");
    expect(format(undefined, "input")).toBe("");
    // Values keep their decimals and suffix when integral
    expect(format(12, "value")).toBe("12.000%");
  });

  it("rounds non-integral input data only to the decimal places", () => {
    expect(createValueFormatter(1, "")(2.5, "input")).toBe("2.5");
    expect(createValueFormatter(0, "")(2.5, "input")).toBe("3");
  });
});
