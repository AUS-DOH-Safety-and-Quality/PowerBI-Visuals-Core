import { describe, expect, it } from "vitest";
import { adjustPaddingForOverflow } from "../src/rendering/index";

const padding = { left: 10, right: 20, top: 30, bottom: 40 };

describe("overflow padding", () => {
  it("returns nothing when the drawing fits the viewport", () => {
    expect(adjustPaddingForOverflow({ x: 0, y: 0, width: 500, height: 500 }, 500, 500, padding)).toBeUndefined();
    expect(adjustPaddingForOverflow({ x: 5, y: 5, width: 400, height: 400 }, 500, 500, padding)).toBeUndefined();
  });

  it("grows each side's padding by exactly its overflow", () => {
    expect(adjustPaddingForOverflow({ x: -10, y: 5, width: 520, height: 480 }, 500, 500, padding))
      .toEqual({ left: 20, right: 30, top: 30, bottom: 40 });
    expect(adjustPaddingForOverflow({ x: 0, y: -3, width: 500, height: 510 }, 500, 500, padding))
      .toEqual({ left: 10, right: 20, top: 33, bottom: 47 });
  });
});
