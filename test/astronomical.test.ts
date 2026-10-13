import { astronomical } from "../src/spc/index";
import { describe, it, expect } from "vitest";

describe("astronomical", () => {
  it("flags each point against its own limits, treating a blank limit as unbounded and a point on a limit as inside", () => {
    const val = [5, 25, 15, 35, -5, 10, 0];
    const ll99 = [0, 10, 20, undefined, 0, 0, 0];
    const ul99 = [10, 20, 30, 40, undefined, 10, 10];
    expect(astronomical(val, ll99, ul99)).toEqual(["none", "upper", "lower", "none", "lower", "none", "none"]);
  });
});
