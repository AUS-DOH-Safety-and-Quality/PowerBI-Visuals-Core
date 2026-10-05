// Client (screen) coordinates to the SVG's user coordinates, honouring any transforms on the SVG
export default function screenToSvg(svg: SVGSVGElement, clientX: number, clientY: number): { x: number; y: number } {
  const point = svg.createSVGPoint();
  point.x = clientX;
  point.y = clientY;
  const ctm = svg.getScreenCTM();
  if (ctm === null) return { x: 0, y: 0 };
  const transformed = point.matrixTransform(ctm.inverse());
  return { x: transformed.x, y: transformed.y };
}
