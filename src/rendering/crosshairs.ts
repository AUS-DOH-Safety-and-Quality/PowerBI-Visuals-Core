export type CrosshairOptions = {
  /** Existing line elements: vertical follows x, horizontal follows y */
  readonly vertical: SVGLineElement;
  readonly horizontal: SVGLineElement;
  readonly left: number;
  readonly right: number;
  readonly top: number;
  readonly bottom: number;
  readonly colour: string;
};

export type Crosshairs = {
  readonly show: (x: number, y: number) => void;
  readonly hide: () => void;
};

function setLine(line: SVGLineElement, x1: number, x2: number, y1: number, y2: number, colour: string): void {
  line.setAttribute("x1", String(x1));
  line.setAttribute("x2", String(x2));
  line.setAttribute("y1", String(y1));
  line.setAttribute("y2", String(y2));
  line.setAttribute("stroke-width", "1px");
  line.setAttribute("stroke", colour);
  line.style.setProperty("stroke-opacity", "0");
}

/** Sizes and hides both lines; the caller decides which point the crosshairs follow */
export function drawCrosshairs(options: CrosshairOptions): Crosshairs {
  const vertical = options.vertical;
  const horizontal = options.horizontal;
  setLine(vertical, 0, 0, options.top, options.bottom, options.colour);
  setLine(horizontal, options.left, options.right, 0, 0, options.colour);
  return {
    show: (x, y) => {
      vertical.style.setProperty("stroke-opacity", "0.4");
      vertical.setAttribute("x1", String(x));
      vertical.setAttribute("x2", String(x));
      horizontal.style.setProperty("stroke-opacity", "0.4");
      horizontal.setAttribute("y1", String(y));
      horizontal.setAttribute("y2", String(y));
    },
    hide: () => {
      vertical.style.setProperty("stroke-opacity", "0");
      horizontal.style.setProperty("stroke-opacity", "0");
    }
  };
}
