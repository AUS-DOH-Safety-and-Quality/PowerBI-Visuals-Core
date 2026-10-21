import { describe, expect, it } from "vitest";
import { select } from "d3-selection";
import { dummyDOM } from "../src/frontends/minidom";
import { must } from "../src/testing/index";

// eslint-disable-next-line powerbi-visuals/no-http-string -- a namespace name, never fetched
const XLINK = "http://www.w3.org/1999/xlink";

/** Parses serialised output as a browser would, failing on malformed markup */
function parseXml(xml: string): Document {
  const parsed = new DOMParser().parseFromString(xml, "application/xml");
  expect(parsed.getElementsByTagName("parsererror")).toHaveLength(0);
  return parsed;
}

describe("minidom", () => {
  it("preserves tree links when moving and clearing children", () => {
    const doc = dummyDOM().document;
    const root = doc.createElement("g");
    const a = root.appendChild(doc.createElement("a"));
    const b = root.appendChild(doc.createElement("b"));
    const c = root.appendChild(doc.createElement("c"));
    root.insertBefore(a, c);
    root.insertBefore(a, a);
    expect([root.childNodes[0], root.childNodes[1], root.childNodes[2]]).toEqual([b, a, c]);
    expect(root.firstChild).toBe(b);
    expect(root.lastChild).toBe(c);
    expect([b.previousSibling, b.nextSibling, a.previousSibling, a.nextSibling, c.previousSibling, c.nextSibling]).toEqual([null, a, b, c, a, null]);
    // eslint-disable-next-line powerbi-visuals/no-inner-outer-html -- minidom only clears, never parses
    root.innerHTML = "";
    expect(root.childNodes).toHaveLength(0);
    expect([root.firstChild, root.lastChild, a.parentNode, a.previousSibling, a.nextSibling]).toEqual([null, null, null, null, null]);
    root.appendChild(a);
    root.textContent = "replacement";
    expect([a.parentNode, a.nextSibling, a.previousSibling]).toEqual([null, null, null]);
    expect(root.childNodes).toHaveLength(1);
    root.appendChild(a);
    expect(root.textContent).toBe("replacement");
  });

  it("replaces children and detaches the previous nodes", () => {
    const doc = dummyDOM().document;
    const root = doc.createElement("g");
    const old = root.appendChild(doc.createElement("text"));
    const replacement = doc.createElement("text");
    replacement.textContent = "new";
    root.replaceChildren(replacement, " label");
    expect(root.textContent).toBe("new label");
    expect(old.parentNode).toBeNull();
    expect(root.firstChild).toBe(replacement);
    expect(replacement.nextSibling).toBe(root.lastChild);
    root.replaceChildren();
    expect(root.childNodes).toHaveLength(0);
    expect([root.firstChild, root.lastChild, replacement.parentNode, replacement.nextSibling]).toEqual([null, null, null, null]);
  });

  it("serializes current attributes and escapes text once", () => {
    const doc = dummyDOM().document;
    const root = doc.createElement("svg");
    const child = select(root).append("text").attr("fill", "red");
    child.attr("fill", null).attr("fill", "blue").attr("title", "\"<&");
    child.classed("active", true).classed("active", false).classed("active", true);
    child.text("A & B < C > D &amp;");
    const holder = doc.createElement("g");
    holder.appendChild(must(child.node()).cloneNode(true));
    const clone = must(holder.firstElementChild);
    child.attr("title", null);
    root.appendChild(must(child.node()).cloneNode(true));
    child.attr("empty", "");
    const children = parseXml(`<svg>${root.innerHTML}</svg>`).documentElement.children;
    expect(children).toHaveLength(2);
    for (let i = 0; i < children.length; i++) {
      expect(children[i].getAttribute("fill")).toBe("blue");
      expect(children[i].getAttribute("class")).toBe("active");
      expect(children[i].getAttribute("title")).toBeNull();
      expect(children[i].textContent).toBe("A & B < C > D &amp;");
    }
    expect(child.attr("empty")).toBe("");
    expect(clone.hasAttribute("constructor")).toBe(false);
    expect(clone.textContent).toBe("A & B < C > D &amp;");
  });

  it("supports selectors used by chart redraws", () => {
    const doc = dummyDOM().document;
    const root = doc.createElement("svg");
    const group = select(root).append("g").attr("class", "tick");
    const text = group.append("text").attr("class", "label\tactive").attr("id", "value");
    group.append("line");
    expect(root.querySelectorAll(" .tick\t  text.label.active#value, line ")).toHaveLength(2);
    expect(root.querySelector(".tick text")).toBe(text.node());
    group.selectAll("*").remove();
    expect(must(group.node()).childNodes).toHaveLength(0);
  });

  it("keeps styles and style attributes synchronized", () => {
    const doc = dummyDOM().document;
    const root = doc.createElement("svg");
    const child = select(root).append("rect");
    child.attr("style", "fill: red !important; fill: blue; font-family: \"a;b\"");
    expect(child.style("fill")).toBe("red");
    expect(child.style("font-family")).toBe("\"a;b\"");
    child.style("opacity", 0);
    expect(child.style("opacity")).toBe("0");
    const holder = doc.createElement("g");
    holder.appendChild(must(child.node()).cloneNode());
    const clone = must(holder.querySelector<HTMLElement>("rect"));
    child.style("fill", "green", "important");
    expect(must(child.node()).style.removeProperty("opacity")).toBe("0");
    const serialized = root.innerHTML;
    child.attr("style", null);
    expect(clone.style.getPropertyValue("fill")).toBe("red");
    expect(clone.style.getPropertyPriority("fill")).toBe("important");
    expect(must(child.node()).style.getPropertyValue("fill")).toBe("");
    expect(must(child.node()).hasAttribute("style")).toBe(false);
    expect(parseXml(serialized).documentElement.getAttribute("style")).toContain("fill:green !important");
  });

  it("preserves namespaced attributes through D3 and serialization", () => {
    const doc = dummyDOM().document;
    const root = doc.createElement("svg");
    const child = select(root).append("use").attr("xlink:href", "#symbol");
    expect(child.attr("xlink:href")).toBe("#symbol");
    root.appendChild(must(child.node()).cloneNode());
    child.attr("xlink:href", null);
    expect(child.attr("xlink:href")).toBeNull();
    const uses = parseXml(`<svg>${root.innerHTML}</svg>`).getElementsByTagName("use");
    let linked = 0;
    for (let i = 0; i < uses.length; i++) {
      if (uses[i].getAttributeNS(XLINK, "href") === "#symbol") {
        linked++;
      }
    }
    expect(linked).toBe(1);
  });

  it("compares ancestors, siblings, cousins, and detached nodes", () => {
    const doc = dummyDOM().document;
    const root = doc.createElement("svg");
    const left = root.appendChild(doc.createElement("g"));
    const right = root.appendChild(doc.createElement("g"));
    const a = left.appendChild(doc.createElement("text"));
    const b = right.appendChild(doc.createElement("text"));
    const detached = doc.createElement("g");
    const forward = root.compareDocumentPosition(detached);
    const backward = detached.compareDocumentPosition(root);
    expect(a.compareDocumentPosition(a)).toBe(0);
    expect(root.compareDocumentPosition(a)).toBe(20);
    expect(a.compareDocumentPosition(root)).toBe(10);
    expect(left.compareDocumentPosition(right)).toBe(4);
    expect(a.compareDocumentPosition(b)).toBe(4);
    expect(b.compareDocumentPosition(a)).toBe(2);
    expect(forward & 33).toBe(33);
    expect(backward & 33).toBe(33);
    expect(forward ^ backward).toBe(6);
  });

  it("stops parentElement at the document", () => {
    const doc = dummyDOM().document;
    const root = doc.createElement("div");
    const child = root.appendChild(doc.createElement("span"));
    expect(child.parentElement).toBe(root);
    expect(root.parentElement).toBeNull();
    expect(doc.body.parentElement).toBe(doc.documentElement);
    expect(doc.documentElement.parentElement).toBeNull();
  });

  it("matches selector lists once per element in document order", () => {
    const doc = dummyDOM().document;
    const root = doc.createElement("div");
    root.className = "container";
    doc.body.appendChild(root);
    const first = root.appendChild(doc.createElement("span"));
    first.setAttribute("id", "first");
    first.className = "item selected";
    const second = root.appendChild(doc.createElement("span"));
    second.setAttribute("id", "second");
    second.className = "other";
    const third = root.appendChild(doc.createElement("div"));
    third.setAttribute("id", "third");
    const matched = root.querySelectorAll(".other, .item, .selected");
    expect(matched).toHaveLength(2);
    expect([matched[0].getAttribute("id"), matched[1].getAttribute("id")]).toEqual(["first", "second"]);
    expect(must(root.querySelector(".other,.item")).getAttribute("id")).toBe("first");
    expect(first.matches(".absent, .container .item")).toBe(true);
    expect(third.matches(".absent, div")).toBe(true);
    expect(first.matches("#second, #first")).toBe(true);
    expect(third.matches(".other, .item")).toBe(false);
  });
});
