export type LineLabelPosition = "above" | "below" | "beside" | "outside" | "inside";

export type LineLabelPlacement = {
  readonly position: LineLabelPosition;
  /** Lower boundary lines: outside is below the line and inside above; other lines the reverse */
  readonly lower: boolean;
  readonly hpad: number;
  readonly vpad: number;
  readonly lineWidth: number;
  readonly size: number;
};

export type LineLabel = LineLabelPlacement & {
  readonly text: string;
  /** Labelled line end in SVG user coordinates */
  readonly x: number;
  readonly y: number;
  readonly font: string;
  readonly colour: string;
};

export type LineLabelGeometry = {
  readonly anchor: "start" | "end";
  readonly dx: number;
  readonly dy: number;
};

/** textHeight is the rendered text height; only the beside placement uses it */
export function lineLabelGeometry(label: LineLabelPlacement, textHeight: number): LineLabelGeometry {
  let position = label.position;
  if (position === "outside") {
    position = label.lower ? "below" : "above";
  } else if (position === "inside") {
    position = label.lower ? "above" : "below";
  }
  const beside = position === "beside";
  let dy: number;
  if (position === "above") {
    dy = -1 * label.vpad + -label.lineWidth;
  } else if (position === "below") {
    dy = label.vpad + label.size;
  } else {
    dy = -1 * label.vpad + textHeight / 4;
  }
  return { anchor: beside ? "start" : "end", dx: (beside ? 1 : -1) * label.hpad, dy };
}

const SVG_NS = "http://www.w3.org/2000/svg";

/** Replaces the group's direct text children; the caller owns label eligibility and text */
export function drawLineLabels(group: Element, labels: readonly LineLabel[]): void {
  const children = group.children;
  for (let i = children.length - 1; i >= 0; i--) {
    if (children[i].tagName === "text") {
      children[i].remove();
    }
  }
  for (let i = 0; i < labels.length; i++) {
    const label = labels[i];
    const text = group.ownerDocument.createElementNS(SVG_NS, "text");
    group.appendChild(text);
    text.textContent = label.text;
    text.setAttribute("x", String(label.x));
    text.setAttribute("y", String(label.y));
    text.setAttribute("fill", label.colour);
    text.setAttribute("font-size", `${label.size}px`);
    text.setAttribute("font-family", label.font);
    const geometry = lineLabelGeometry(label, text.getBoundingClientRect().height);
    text.setAttribute("text-anchor", geometry.anchor);
    text.setAttribute("dx", `${geometry.dx}px`);
    text.setAttribute("dy", `${geometry.dy}px`);
  }
}
