import { SVG_NS } from "../rendering";

const exportedStyles = [
  "fill", "fill-opacity", "stroke", "stroke-width", "stroke-opacity", "stroke-dasharray",
  "font-family", "font-size", "font-weight", "font-style", "text-anchor",
  "dominant-baseline", "opacity", "visibility", "display"
];

function inlineStyles(from: Element, to: ElementCSSInlineStyle): void {
  const style = getComputedStyle(from);
  for (let i = 0; i < exportedStyles.length; i++) {
    to.style.setProperty(exportedStyles[i], style.getPropertyValue(exportedStyles[i]));
  }
}

/** A standalone copy of the chart, with its computed styles inlined and the tooltip removed */
export function chartSvgBlob(svg: SVGSVGElement): Blob {
  const copy = document.importNode(svg, true);
  const width = svg.width.baseVal.value;
  const height = svg.height.baseVal.value;
  inlineStyles(svg, copy);
  const originals = svg.querySelectorAll("*");
  const copies = copy.querySelectorAll<SVGElement>("*");
  for (let i = 0; i < originals.length; i++) {
    inlineStyles(originals[i], copies[i]);
  }
  const tooltips = copy.querySelectorAll(".chart-tooltip-group");
  for (let i = 0; i < tooltips.length; i++) {
    tooltips[i].remove();
  }
  copy.setAttribute("xmlns", SVG_NS);
  copy.setAttribute("width", String(width));
  copy.setAttribute("height", String(height));
  if (!copy.hasAttribute("viewBox")) {
    copy.setAttribute("viewBox", `0 0 ${width} ${height}`);
  }
  const backgroundColour = getComputedStyle(svg).backgroundColor;
  const background = document.createElementNS(SVG_NS, "rect");
  background.setAttribute("width", "100%");
  background.setAttribute("height", "100%");
  background.setAttribute("fill", backgroundColour === "rgba(0, 0, 0, 0)" ? "white" : backgroundColour);
  copy.prepend(background);
  return new Blob([new XMLSerializer().serializeToString(copy)], { type: "image/svg+xml;charset=utf-8" });
}

/** The chart rasterised at twice its size */
export async function chartPngBlob(svg: SVGSVGElement): Promise<Blob> {
  const url = URL.createObjectURL(chartSvgBlob(svg));
  try {
    const image = new Image();
    image.src = url;
    await image.decode();
    const canvas = document.createElement("canvas");
    canvas.width = Math.ceil(svg.width.baseVal.value * 2);
    canvas.height = Math.ceil(svg.height.baseVal.value * 2);
    const context = canvas.getContext("2d");
    if (context === null) {
      throw new Error("PNG export failed");
    }
    context.drawImage(image, 0, 0, canvas.width, canvas.height);
    return await new Promise((resolve, reject) => {
      canvas.toBlob(blob => {
        if (blob === null) {
          reject(new Error("PNG export failed"));
        } else {
          resolve(blob);
        }
      }, "image/png");
    });
  } finally {
    URL.revokeObjectURL(url);
  }
}
