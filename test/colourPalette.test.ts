import { describe, expect, it } from "vitest";
import { readColourPalette } from "../src/powerbi/index";

describe("colour palette", () => {
  it("flattens the host palette values", () => {
    const host = { colorPalette: {
      isHighContrast: true, foreground: { value: "#111111" }, background: { value: "#222222" },
      foregroundSelected: { value: "#333333" }, hyperlink: { value: "#444444" }
    } };
    expect(readColourPalette(host)).toEqual({
      isHighContrast: true, foregroundColour: "#111111", backgroundColour: "#222222",
      foregroundSelectedColour: "#333333", hyperlinkColour: "#444444"
    });
  });
});
