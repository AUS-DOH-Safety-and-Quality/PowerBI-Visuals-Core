import { describe, expect, it } from "vitest";
import { identitySelected, rowIdentity, selectedKeys } from "../src/powerbi/index";
import type { SelectionKeyed } from "../src/powerbi/selection";
import { keyedHost } from "../src/testing/index";

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
  });

  it("selects nothing when the selection is empty", () => {
    const selected = selectedKeys([]);
    expect(identitySelected(id("a"), selected)).toBe(false);
    expect(identitySelected([id("a")], selected)).toBe(false);
  });
});

describe("row identities", () => {
  it("builds one identity from every column, so a key repeated under another grouping stays distinct", () => {
    const host = keyedHost();
    const key = { source: { displayName: "Key" }, values: ["A", "A"] } as never;
    const group = { source: { displayName: "Group" }, values: ["X", "Y"] } as never;
    expect(rowIdentity(host, [key, group], 1).getKey()).toBe("Key[1];Group[1];");
    expect(rowIdentity(host, [key], 0).getKey()).toBe("Key[0];");
    expect(rowIdentity(host, [key, group], 0).getKey()).not.toBe(rowIdentity(host, [key, group], 1).getKey());
  });
});
