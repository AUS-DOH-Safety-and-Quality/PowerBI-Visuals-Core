// Minimal SVG DOM for headless rendering in QuickJS; no HTML parsing, CSS cascade, or layout.
import type { initialiseHeadless } from "./headless";

/* eslint-disable powerbi-visuals/no-http-string -- namespaces are names, never fetched */
const XHTML_NAMESPACE = "http://www.w3.org/1999/xhtml";
const XMLNS_NAMESPACE = "http://www.w3.org/2000/xmlns/";
const XLINK_NAMESPACE = "http://www.w3.org/1999/xlink";
const XML_NAMESPACE = "http://www.w3.org/XML/1998/namespace";
/* eslint-enable powerbi-visuals/no-http-string */

const DISCONNECTED = 1;
const PRECEDING = 2;
const FOLLOWING = 4;
const CONTAINS = 8;
const CONTAINED_BY = 16;
const IMPLEMENTATION_SPECIFIC = 32;

let nextNodeId = 0;

type MiniNode = MiniElement | MiniText;

/** What d3 writes as attribute, style and text values */
type DOMValue = string | number | boolean;

interface Attribute {
  namespaceURI: string | null;
  localName: string;
  value: string | MiniStyle;
}

interface StyleValue {
  readonly value: string;
  readonly priority: string;
}

function escapeText(value: string): string {
  return value.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

function escapeAttr(value: string | MiniStyle): string {
  return escapeText(String(value)).replace(/"/g, "&quot;");
}

function classNames(element: MiniElement): string[] {
  const value = (element.getAttribute("class") ?? "").trim();
  return value ? value.split(/\s+/) : [];
}

class ClassList {
  private readonly element: MiniElement;

  constructor(element: MiniElement) {
    this.element = element;
  }

  add(className: string): void {
    const classes = classNames(this.element);
    if (classes.indexOf(className) === -1) {
      classes.push(className);
      this.element.setAttribute("class", classes.join(" "));
    }
  }

  remove(className: string): void {
    const classes = classNames(this.element);
    const index = classes.indexOf(className);
    if (index !== -1) {
      classes.splice(index, 1);
      this.element.setAttribute("class", classes.join(" "));
    }
  }

  contains(className: string): boolean {
    return classNames(this.element).indexOf(className) !== -1;
  }
}

class MiniStyle {
  private readonly element: MiniElement;
  private readonly styles = new Map<string, StyleValue>();

  constructor(element: MiniElement) {
    this.element = element;
  }

  setProperty(name: string, value: DOMValue | null | undefined, priority?: string | null): void {
    if (value === null || value === undefined || value === "") {
      this.removeProperty(name);
      return;
    }
    const level = (priority ?? "").toLowerCase();
    if (level !== "" && level !== "important") {
      return;
    }
    this.styles.set(name, { value: String(value), priority: level });
    this.sync();
  }

  getPropertyValue(name: string): string {
    return this.styles.get(name)?.value ?? "";
  }

  getPropertyPriority(name: string): string {
    return this.styles.get(name)?.priority ?? "";
  }

  removeProperty(name: string): string {
    const value = this.getPropertyValue(name);
    this.styles.delete(name);
    if (value !== "") {
      this.sync();
    }
    return value;
  }

  clear(): void {
    this.styles.clear();
  }

  /** The style attribute holds this declaration, so it serialises as edited */
  private sync(): void {
    this.element.attributeMap.set("style", { namespaceURI: null, localName: "style", value: this });
  }

  toString(): string {
    return this.cssText;
  }

  parse(text: string): void {
    this.styles.clear();
    let declaration = "";
    let quote = "";
    let depth = 0;
    for (let i = 0; i <= text.length; i++) {
      const char = text.charAt(i);
      if (char === "\\") {
        i++;
        declaration += char + text.charAt(i);
        continue;
      }
      if (quote) {
        declaration += char;
        if (char === quote) {
          quote = "";
        }
        continue;
      }
      if (char === "/" && text.charAt(i + 1) === "*") {
        const end = text.indexOf("*/", i + 2);
        if (end === -1) {
          break;
        }
        i = end + 1;
        continue;
      }
      if (char === "\"" || char === "'") {
        quote = char;
      } else if (char === "(" || char === "[") {
        depth++;
      } else if (char === ")" || char === "]") {
        depth--;
      }
      if (i === text.length || (char === ";" && depth === 0)) {
        const colon = declaration.indexOf(":");
        if (colon !== -1) {
          let name = declaration.slice(0, colon).trim();
          if (!name.startsWith("--")) {
            name = name.toLowerCase();
          }
          const value = declaration.slice(colon + 1).trim();
          const priority = value.search(/\s*!important\s*$/i);
          if (name && value && (priority !== -1 || this.getPropertyPriority(name) !== "important")) {
            this.styles.set(name, {
              value: priority === -1 ? value : value.slice(0, priority),
              priority: priority === -1 ? "" : "important"
            });
          }
        }
        declaration = "";
      } else {
        declaration += char;
      }
    }
  }

  get cssText(): string {
    const styles = Array.from(this.styles);
    let text = "";
    for (let i = 0; i < styles.length; i++) {
      const style = styles[i][1];
      if (i > 0) {
        text += ";";
      }
      text += styles[i][0] + ":" + style.value;
      if (style.priority) {
        text += " !important";
      }
    }
    return text;
  }

  set cssText(value: DOMValue) {
    this.parse(String(value));
    this.sync();
  }
}

function clearChildren(element: MiniElement): void {
  for (let i = 0; i < element.childNodes.length; i++) {
    const child = element.childNodes[i];
    child.parentNode = null;
    child.nextSibling = null;
    child.previousSibling = null;
  }
  element.childNodes.length = 0;
  element.firstChild = null;
  element.lastChild = null;
}

function parseSelector(selector: string): string[][][] {
  const groups = selector.trim().split(/\s*,\s*/);
  const selectors = new Array<string[][]>(groups.length);
  for (let i = 0; i < groups.length; i++) {
    const parts = groups[i].split(/\s+/);
    const compounds = new Array<string[]>(parts.length);
    for (let j = 0; j < parts.length; j++) {
      compounds[j] = parts[j].split(/(?=[.#])/);
    }
    selectors[i] = compounds;
  }
  return selectors;
}

function matchesSimple(element: MiniElement, parts: readonly string[]): boolean {
  for (let i = 0; i < parts.length; i++) {
    const part = parts[i];
    if (part.charAt(0) === ".") {
      if (!element.classList.contains(part.slice(1))) {
        return false;
      }
    } else if (part.charAt(0) === "#") {
      if (element.getAttribute("id") !== part.slice(1)) {
        return false;
      }
    } else if (part !== "*" && element.tagName !== part) {
      return false;
    }
  }
  return true;
}

function matches(element: MiniElement, selectors: readonly string[][][]): boolean {
  for (let i = 0; i < selectors.length; i++) {
    const parts = selectors[i];
    if (!matchesSimple(element, parts[parts.length - 1])) {
      continue;
    }
    let node = element.parentNode;
    let j = parts.length - 2;
    while (j >= 0 && node !== null && node.nodeType === 1) {
      if (matchesSimple(node, parts[j])) {
        j--;
      }
      node = node.parentNode;
    }
    if (j < 0) {
      return true;
    }
  }
  return false;
}

function query(element: MiniElement, selector: string, firstOnly: boolean): MiniElement[] {
  const results: MiniElement[] = [];
  const selectors = parseSelector(selector);

  function traverse(node: MiniNode): boolean {
    if (node.nodeType === 1 && matches(node, selectors)) {
      results.push(node);
      if (firstOnly) {
        return true;
      }
    }
    for (let i = 0; i < node.childNodes.length; i++) {
      if (traverse(node.childNodes[i])) {
        return true;
      }
    }
    return false;
  }

  for (let i = 0; i < element.childNodes.length; i++) {
    if (traverse(element.childNodes[i])) {
      break;
    }
  }
  return results;
}

class MiniElement {
  readonly serial = nextNodeId++;
  readonly nodeType: 1 | 9 = 1;
  readonly tagName: string;
  readonly nodeName: string;
  readonly namespaceURI: string | null;
  ownerDocument: MiniDocument | null;
  parentNode: MiniElement | null = null;
  readonly childNodes: MiniNode[] = [];
  nextSibling: MiniNode | null = null;
  previousSibling: MiniNode | null = null;
  firstChild: MiniNode | null = null;
  lastChild: MiniNode | null = null;
  readonly attributeMap = new Map<string, Attribute>();
  readonly style: MiniStyle;
  private classes: ClassList | null = null;

  constructor(tagName: string, namespaceURI: string | null, ownerDocument: MiniDocument | null) {
    this.tagName = tagName;
    this.nodeName = tagName;
    this.namespaceURI = namespaceURI;
    this.ownerDocument = ownerDocument;
    this.style = new MiniStyle(this);
  }

  get classList(): ClassList {
    this.classes ??= new ClassList(this);
    return this.classes;
  }

  get className(): string {
    return this.getAttribute("class") ?? "";
  }

  set className(value: string) {
    this.setAttribute("class", value);
  }

  get parentElement(): MiniElement | null {
    return this.parentNode !== null && this.parentNode.nodeType === 1 ? this.parentNode : null;
  }

  get children(): MiniElement[] {
    const children: MiniElement[] = [];
    for (let i = 0; i < this.childNodes.length; i++) {
      const child = this.childNodes[i];
      if (child.nodeType === 1) {
        children.push(child);
      }
    }
    return children;
  }

  get firstElementChild(): MiniElement | null {
    for (let i = 0; i < this.childNodes.length; i++) {
      const child = this.childNodes[i];
      if (child.nodeType === 1) {
        return child;
      }
    }
    return null;
  }

  get innerHTML(): string {
    let html = "";
    for (let i = 0; i < this.childNodes.length; i++) {
      const child = this.childNodes[i];
      if (child.nodeType === 3) {
        html += escapeText(child.nodeValue);
      } else if (child.nodeType === 1) {
        html += "<" + child.tagName;
        const attributes = Array.from(child.attributeMap);
        const declared = new Set<string>();
        for (let j = 0; j < attributes.length; j++) {
          let name = attributes[j][0];
          const attribute = attributes[j][1];
          if (attribute.namespaceURI !== null && attribute.namespaceURI !== XMLNS_NAMESPACE) {
            const colon = name.indexOf(":");
            let prefix = name.slice(0, colon);
            if (colon === -1) {
              prefix = `ns${j}`;
              if (attribute.namespaceURI === XLINK_NAMESPACE) {
                prefix = "xlink";
              } else if (attribute.namespaceURI === XML_NAMESPACE) {
                prefix = "xml";
              }
            }
            name = prefix + ":" + attribute.localName;
            if (!declared.has(prefix) && !child.hasAttribute("xmlns:" + prefix)) {
              html += " xmlns:" + prefix + "=\"" + escapeAttr(attribute.namespaceURI) + "\"";
              declared.add(prefix);
            }
          }
          html += " " + name + "=\"" + escapeAttr(attribute.value) + "\"";
        }
        if (child.childNodes.length === 0) {
          html += " />";
        } else {
          html += ">" + child.innerHTML + "</" + child.tagName + ">";
        }
      }
    }
    return html;
  }

  set innerHTML(value: string | null) {
    if (value !== "" && value !== null) {
      throw new Error("HTML parsing is not supported");
    }
    clearChildren(this);
  }

  get textContent(): string {
    let text = "";
    for (let i = 0; i < this.childNodes.length; i++) {
      const child = this.childNodes[i];
      if (child.nodeType === 3) {
        text += child.nodeValue;
      } else if (child.nodeType === 1) {
        text += child.textContent;
      }
    }
    return text;
  }

  set textContent(value: DOMValue | null | undefined) {
    clearChildren(this);
    if (value !== null && value !== undefined && value !== "") {
      this.appendChild(new MiniText(String(value), this.ownerDocument));
    }
  }

  get ownerSVGElement(): MiniElement | null {
    let node = this.parentNode;
    while (node !== null) {
      if (node.tagName === "svg") {
        return node;
      }
      node = node.parentNode;
    }
    return null;
  }

  appendChild(child: MiniNode): MiniNode {
    child.parentNode?.removeChild(child);
    child.parentNode = this;
    child.nextSibling = null;
    child.previousSibling = this.lastChild;
    if (this.lastChild !== null) {
      this.lastChild.nextSibling = child;
    }
    this.lastChild = child;
    this.firstChild ??= child;
    this.childNodes.push(child);
    return child;
  }

  replaceChildren(...nodes: (MiniNode | string)[]): void {
    clearChildren(this);
    for (let i = 0; i < nodes.length; i++) {
      const node = nodes[i];
      this.appendChild(typeof node === "string" ? new MiniText(node, this.ownerDocument) : node);
    }
  }

  removeChild(child: MiniNode): MiniNode {
    const index = this.childNodes.indexOf(child);
    if (index === -1) {
      throw new Error("Node not found");
    }
    this.childNodes.splice(index, 1);
    if (child.previousSibling !== null) {
      child.previousSibling.nextSibling = child.nextSibling;
    } else {
      this.firstChild = child.nextSibling;
    }
    if (child.nextSibling !== null) {
      child.nextSibling.previousSibling = child.previousSibling;
    } else {
      this.lastChild = child.previousSibling;
    }
    child.parentNode = null;
    child.nextSibling = null;
    child.previousSibling = null;
    return child;
  }

  insertBefore(newNode: MiniNode, refNode: MiniNode | null | undefined): MiniNode {
    if (refNode === null || refNode === undefined) {
      return this.appendChild(newNode);
    }
    if (refNode.parentNode !== this) {
      throw new Error("Reference node not found");
    }
    if (newNode === refNode) {
      return newNode;
    }
    newNode.parentNode?.removeChild(newNode);
    newNode.parentNode = this;
    newNode.nextSibling = refNode;
    newNode.previousSibling = refNode.previousSibling;
    if (refNode.previousSibling !== null) {
      refNode.previousSibling.nextSibling = newNode;
    } else {
      this.firstChild = newNode;
    }
    refNode.previousSibling = newNode;
    this.childNodes.splice(this.childNodes.indexOf(refNode), 0, newNode);
    return newNode;
  }

  setAttribute(name: string, value: DOMValue): void {
    this.writeAttribute(name, String(value));
  }

  setAttributeNS(namespaceURI: string | null, qualifiedName: string, value: DOMValue | MiniStyle): void {
    const localName = qualifiedName.slice(qualifiedName.indexOf(":") + 1);
    const attribute = this.writeAttribute(this.attributeNameNS(namespaceURI, localName) ?? qualifiedName, String(value));
    attribute.namespaceURI = namespaceURI || null;
    attribute.localName = localName;
  }

  getAttributeNS(namespaceURI: string | null, localName: string): string | null {
    const name = this.attributeNameNS(namespaceURI, localName);
    return name === null ? null : this.getAttribute(name);
  }

  removeAttributeNS(namespaceURI: string | null, localName: string): void {
    const name = this.attributeNameNS(namespaceURI, localName);
    if (name !== null) {
      this.removeAttribute(name);
    }
  }

  getAttribute(name: string): string | null {
    const attribute = this.attributeMap.get(name);
    return attribute === undefined ? null : String(attribute.value);
  }

  removeAttribute(name: string): void {
    this.attributeMap.delete(name);
    if (name === "style") {
      this.style.clear();
    }
  }

  hasAttribute(name: string): boolean {
    return this.attributeMap.has(name);
  }

  querySelector(selector: string): MiniElement | null {
    const found = query(this, selector, true);
    return found.length > 0 ? found[0] : null;
  }

  querySelectorAll(selector: string): MiniElement[] {
    return query(this, selector, false);
  }

  matches(selector: string): boolean {
    return matches(this, parseSelector(selector));
  }

  cloneNode(deep?: boolean): MiniElement {
    const clone = new MiniElement(this.tagName, this.namespaceURI, this.ownerDocument);
    const attributes = Array.from(this.attributeMap);
    for (let i = 0; i < attributes.length; i++) {
      clone.setAttributeNS(attributes[i][1].namespaceURI, attributes[i][0], attributes[i][1].value);
    }
    if (deep === true) {
      for (let i = 0; i < this.childNodes.length; i++) {
        clone.appendChild(this.childNodes[i].cloneNode(true));
      }
    }
    return clone;
  }

  compareDocumentPosition(other: MiniNode): number {
    if (this === other) {
      return 0;
    }
    if (this.parentNode !== null && this.parentNode === other.parentNode) {
      const siblings = this.parentNode.childNodes;
      return siblings.indexOf(this) < siblings.indexOf(other) ? FOLLOWING : PRECEDING;
    }
    const ancestors: MiniNode[] = [this];
    const otherAncestors: MiniNode[] = [other];
    let node = this.parentNode;
    let otherNode = other.parentNode;
    while (node !== null || otherNode !== null) {
      if (node !== null) {
        ancestors.push(node);
        node = node.parentNode;
      }
      if (otherNode !== null) {
        otherAncestors.push(otherNode);
        otherNode = otherNode.parentNode;
      }
    }
    let i = ancestors.length - 1;
    let j = otherAncestors.length - 1;
    if (ancestors[i] !== otherAncestors[j]) {
      return DISCONNECTED | IMPLEMENTATION_SPECIFIC | (this.serial < other.serial ? FOLLOWING : PRECEDING);
    }
    while (i >= 0 && j >= 0 && ancestors[i] === otherAncestors[j]) {
      i--;
      j--;
    }
    if (i < 0) {
      return CONTAINED_BY | FOLLOWING;
    }
    if (j < 0) {
      return CONTAINS | PRECEDING;
    }
    const siblings = ancestors[i + 1].childNodes;
    return siblings.indexOf(ancestors[i]) < siblings.indexOf(otherAncestors[j]) ? FOLLOWING : PRECEDING;
  }

  contains(other: MiniNode | null): boolean {
    let node: MiniNode | null = other;
    while (node !== null) {
      if (node === this) {
        return true;
      }
      node = node.parentNode;
    }
    return false;
  }

  addEventListener(): void {
    return;
  }

  removeEventListener(): void {
    return;
  }

  dispatchEvent(): boolean {
    return true;
  }

  getBoundingClientRect(): Omit<DOMRectReadOnly, "toJSON"> {
    return { x: 0, y: 0, width: 0, height: 0, top: 0, right: 0, bottom: 0, left: 0 };
  }

  /** Sets a plain attribute, or the value of whichever attribute already has the name */
  private writeAttribute(name: string, value: string): Attribute {
    let attribute = this.attributeMap.get(name);
    if (attribute === undefined) {
      attribute = { namespaceURI: null, localName: name, value };
      this.attributeMap.set(name, attribute);
    } else {
      attribute.value = value;
    }
    if (name === "style") {
      this.style.parse(value);
    }
    return attribute;
  }

  private attributeNameNS(namespaceURI: string | null, localName: string): string | null {
    const attributes = Array.from(this.attributeMap);
    for (let i = 0; i < attributes.length; i++) {
      const attribute = attributes[i][1];
      if (attribute.namespaceURI === (namespaceURI || null) && attribute.localName === localName) {
        return attributes[i][0];
      }
    }
    return null;
  }
}

class MiniText {
  readonly serial = nextNodeId++;
  readonly nodeType = 3;
  readonly nodeName = "#text";
  readonly nodeValue: string;
  readonly ownerDocument: MiniDocument | null;
  parentNode: MiniElement | null = null;
  nextSibling: MiniNode | null = null;
  previousSibling: MiniNode | null = null;
  // d3 reads childNodes of every node
  readonly childNodes: readonly MiniNode[] = [];

  constructor(text: string, ownerDocument: MiniDocument | null) {
    this.nodeValue = text;
    this.ownerDocument = ownerDocument;
  }

  cloneNode(): MiniText {
    return new MiniText(this.nodeValue, this.ownerDocument);
  }
}

class MiniDocument extends MiniElement {
  override readonly nodeType = 9;
  readonly documentElement: MiniElement;
  readonly head: MiniElement;
  readonly body: MiniElement;
  view: MiniWindow | null = null;

  constructor() {
    super("#document", null, null);
    this.ownerDocument = this;
    this.documentElement = this.createElement("html");
    this.appendChild(this.documentElement);
    this.head = this.createElement("head");
    this.body = this.createElement("body");
    this.documentElement.appendChild(this.head);
    this.documentElement.appendChild(this.body);
  }

  get defaultView(): MiniWindow | null {
    return this.view;
  }

  createElement(tagName: string): MiniElement {
    return new MiniElement(tagName, XHTML_NAMESPACE, this);
  }

  createElementNS(namespaceURI: string | null, qualifiedName: string): MiniElement {
    return new MiniElement(qualifiedName, namespaceURI, this);
  }

  createTextNode(text: DOMValue): MiniText {
    return new MiniText(String(text), this);
  }
}

class MiniWindow {
  readonly document: MiniDocument;
  readonly defaultView: MiniWindow = this;

  constructor(document: MiniDocument) {
    this.document = document;
    document.view = this;
  }
}

/** Typed as the DOM it stands in for, implementing only what d3 and the renderers use */
export function dummyDOM(): Parameters<typeof initialiseHeadless>[0] {
  const document = new MiniDocument();
  return { document, window: new MiniWindow(document) } as unknown as Parameters<typeof initialiseHeadless>[0];
}
