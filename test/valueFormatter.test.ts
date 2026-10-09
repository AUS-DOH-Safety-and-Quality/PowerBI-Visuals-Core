import { describe, expect, it } from "vitest";
import { createValueFormatter } from "../src/data/index.js";

describe("value formatter", () => {
  it("applies decimal places and suffix to values and integer places without suffix", () => {
    const format = createValueFormatter(2, 0, "%");
    expect(format(12.625, "value")).toBe("12.63%");
    expect(format(12.625, "integer")).toBe("13");
  });

  it("uses the decimal places for integers when asked and gives blank for missing values", () => {
    const format = createValueFormatter(2, 2, "");
    expect(format(12.625, "integer")).toBe("12.63");
    expect(format(undefined, "value")).toBe("");
  });
});
