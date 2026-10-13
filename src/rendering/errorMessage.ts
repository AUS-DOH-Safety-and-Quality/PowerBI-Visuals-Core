import { initialiseSvg } from "./initialiseSvg";

/** An empty view leaves a blank canvas rather than a message */
export type ErrorKind = "internal" | "settings" | "empty";

export type ErrorMessageOptions = {
  readonly width: number;
  readonly height: number;
  readonly message: string;
  /** A kind adds its preamble above the message */
  readonly kind: ErrorKind | undefined;
  readonly colour: string;
  /** A hidden error leaves an empty canvas */
  readonly show: boolean;
};

const preambles: Readonly<Partial<Record<ErrorKind, string>>> = {
  internal: "Internal Error! Please file a bug report with the following text:",
  settings: "Invalid settings provided for all observations! First error:"
};

const SVG_NS = "http://www.w3.org/2000/svg";

function addText(group: SVGGElement, x: number, y: number, text: string, colour: string): void {
  const element = group.ownerDocument.createElementNS(SVG_NS, "text");
  group.appendChild(element);
  element.setAttribute("x", String(x));
  element.setAttribute("y", String(y));
  element.style.setProperty("text-anchor", "middle");
  element.textContent = text;
  element.style.setProperty("font-size", "10px");
  element.style.setProperty("fill", colour);
}

/** Replaces the plot with a centred error message group */
export function drawErrorMessage(svg: SVGSVGElement, options: ErrorMessageOptions): void {
  initialiseSvg(svg, true);
  if (!options.show) {
    return;
  }
  const group = svg.ownerDocument.createElementNS(SVG_NS, "g");
  svg.appendChild(group);
  group.classList.add("errormessage");
  const x = options.width / 2;
  const preamble = options.kind === undefined ? undefined : preambles[options.kind];
  if (preamble !== undefined) {
    addText(group, x, options.height / 3, preamble, options.colour);
  }
  addText(group, x, options.height / 2, options.message, options.colour);
}
