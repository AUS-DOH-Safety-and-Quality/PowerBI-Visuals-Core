import { describe, expect, it } from "vitest";
import { applyFlagColours, type FlagDirection } from "../src/data/index";

const colours = {
  shift_colour_improvement: "#111111",
  shift_colour_deterioration: "#222222",
  shift_colour_neutral_low: "#333333",
  shift_colour_neutral_high: "#444444",
  ast_colour_improvement: "#555555",
  ast_colour_deterioration: "#666666",
  ast_colour_neutral_low: "#777777",
  ast_colour_neutral_high: "#888888"
};

function flagged(shift: FlagDirection, ast: FlagDirection) {
  const aesthetics = { colour: "#000000", colour_outline: "#ffffff" };
  applyFlagColours(aesthetics, colours, [[shift, "shift_colour"], [ast, "ast_colour"]] as const);
  return aesthetics;
}

describe("flag colours", () => {
  it("colours fill and outline by the last raised flag and leaves unflagged points alone", () => {
    expect(flagged("none", "none")).toEqual({ colour: "#000000", colour_outline: "#ffffff" });
    expect(flagged("improvement", "none")).toEqual({ colour: "#111111", colour_outline: "#111111" });
    expect(flagged("improvement", "neutral_high")).toEqual({ colour: "#888888", colour_outline: "#888888" });
    expect(flagged("deterioration", "none")).toEqual({ colour: "#222222", colour_outline: "#222222" });
  });

  it("recolours group text only where the point draws it", () => {
    const text = { colour: "#000000", colour_outline: "#000000", scatter_text_colour: "#000000" };
    applyFlagColours(text, colours, [[ "neutral_low", "shift_colour"]] as const);
    expect(text.scatter_text_colour).toBe("#333333");
  });
});
