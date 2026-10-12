import { describe, expect, it } from "vitest";
import sigmaLimits from "../src/spc/sigmaLimits";

describe("sigma limits", () => {
  it("spaces constant limits one, two and three sigma from the centre", () => {
    expect(sigmaLimits(2, 10, { sigma: 2 })).toEqual({
      target: [10, 10], ll99: [4, 4], ll95: [6, 6], ll68: [8, 8], ul68: [12, 12], ul95: [14, 14], ul99: [16, 16]
    });
  });

  it("takes each point's sigma and bounds the limits, keeping a separate centreline", () => {
    const limits = sigmaLimits(3, 0.5, { sigma: i => [0.1, 0.2, 0.3][i], target: 0.4, floor: 0, ceiling: 1 });
    expect(limits.target).toEqual([0.4, 0.4, 0.4]);
    expect(limits.ll99).toEqual([0.5 - 3 * 0.1, 0, 0]);
    expect(limits.ll95).toEqual([0.5 - 0.2, 0.5 - 0.4, 0]);
    expect(limits.ll68).toEqual([0.4, 0.3, 0.2]);
    expect(limits.ul68).toEqual([0.6, 0.7, 0.8]);
    expect(limits.ul95).toEqual([0.7, 0.9, 1]);
    expect(limits.ul99).toEqual([0.8, 1, 1]);
  });

  it("collapses onto the centre when sigma is zero", () => {
    expect(sigmaLimits(1, 1, { sigma: 0, floor: 0, ceiling: 1 })).toEqual({
      target: [1], ll99: [1], ll95: [1], ll68: [1], ul68: [1], ul95: [1], ul99: [1]
    });
  });
});
