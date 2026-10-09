export type DownloadButtonOptions = {
  readonly visible: boolean;
  readonly x: number;
  readonly y: number;
  readonly onClick: () => void;
};

const SVG_NS = "http://www.w3.org/2000/svg";

/** Keeps a single underlined "Download" link at the position; removed when not visible */
export function drawDownloadButton(svg: SVGSVGElement, options: DownloadButtonOptions): void {
  let button = svg.querySelector<SVGTextElement>(".download-btn-group");
  if (!options.visible) {
    button?.remove();
    return;
  }
  if (button === null) {
    button = svg.ownerDocument.createElementNS(SVG_NS, "text");
    button.classList.add("download-btn-group");
    svg.appendChild(button);
  }
  button.setAttribute("x", String(options.x));
  button.setAttribute("y", String(options.y));
  button.textContent = "Download";
  button.style.setProperty("font-size", "10px");
  button.style.setProperty("text-decoration", "underline");
  button.onclick = () => options.onClick();
}
