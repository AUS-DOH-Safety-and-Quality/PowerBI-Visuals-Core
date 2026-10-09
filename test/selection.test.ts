import { describe, expect, it } from "vitest";
import { identitySelected, selectedKeys } from "../src/powerbi/index";
import type { SelectionKeyed } from "../src/powerbi/selection";

function id(key: string): SelectionKeyed {
  return { getKey: () => key };
}

describe("selection matching", () => {
  it("collects the selected keys once", () => {
    expect(selectedKeys([])).toEqual(new Set());
    expect(selectedKeys([id("a"), id("b"), id("a")])).toEqual(new Set(["a", "b"]));
  });

  it("matches scalar identities by key, not by reference", () => {
    const selected = selectedKeys([id("a")]);
    expect(identitySelected(id("a"), selected)).toBe(true);
    expect(identitySelected(id("b"), selected)).toBe(false);
  });

  it("matches grouped identities when any member is selected", () => {
    const selected = selectedKeys([id("c")]);
    expect(identitySelected([id("a"), id("c")], selected)).toBe(true);
    expect(identitySelected([id("a"), id("b")], selected)).toBe(false);
    expect(identitySelected([], selected)).toBe(false);
  });

  it("selects nothing when the selection is empty", () => {
    const selected = selectedKeys([]);
    expect(identitySelected(id("a"), selected)).toBe(false);
    expect(identitySelected([id("a")], selected)).toBe(false);
  });
});
