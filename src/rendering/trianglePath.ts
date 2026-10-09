const SQRT3 = Math.sqrt(3);

function round3(value: number): number {
  return Math.round(value * 1000) / 1000;
}

/** d3-shape's symbolTriangle path for the given area, with d3-path's default 3-digit rounding */
export default function trianglePath(size: number): string {
  const y = -Math.sqrt(size / (SQRT3 * 3));
  return `M${round3(0)},${round3(y * 2)}L${round3(-SQRT3 * y)},${round3(-y)}L${round3(SQRT3 * y)},${round3(-y)}Z`;
}
