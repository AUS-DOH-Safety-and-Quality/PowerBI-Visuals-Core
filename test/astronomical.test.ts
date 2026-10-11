import { astronomical } from "../src/spc/index";
import { describe, it, expect } from "vitest";

describe("astronomical", () => {
  it("flags each point against its own limits, treating a blank limit as unbounded", () => {
    const val = [5, 25, 15, 35, -5];
    const ll99 = [0, 10, 20, undefined, 0];
    const ul99 = [10, 20, 30, 40, undefined];
    expect(astronomical(val, ll99, ul99)).toEqual(["none", "upper", "lower", "none", "lower"]);
  });
});
