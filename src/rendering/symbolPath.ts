import at from "../util/at";
const SQRT3 = Math.sqrt(3);
const TAU = 2 * Math.PI;
const STAR_KA = 0.8908130915292852;
const STAR_KR = Math.sin(Math.PI / 10) / Math.sin(7 * Math.PI / 10);
const STAR_KX = Math.sin(TAU / 10) * STAR_KR;
const STAR_KY = -Math.cos(TAU / 10) * STAR_KR;
const WYE_K = 1 / Math.sqrt(12);
const WYE_A = (WYE_K / 2 + 1) * 3;
const WYE_C = -0.5;
const WYE_S = SQRT3 / 2;
const DIAMOND_TAN30 = Math.sqrt(1 / 3);

/** d3-path's default 3-digit rounding */
export function round3(value: number): number {
  return Math.round(value * 1000) / 1000;
}

/** Closed polygon through consecutive x, y pairs */
function polygon(vertices: readonly number[]): string {
  let path = `M${round3(at(vertices, 0))},${round3(at(vertices, 1))}`;
  for (let i = 2; i < vertices.length; i += 2) {
    path += `L${round3(at(vertices, i))},${round3(at(vertices, i + 1))}`;
  }
  return path + "Z";
}

function circlePath(size: number): string {
  const r = Math.sqrt(size / Math.PI);
  if (r === 0) {
    return "M0,0";
  }
  return `M${round3(r)},0A${round3(r)},${round3(r)},0,1,1,${round3(-r)},0A${round3(r)},${round3(r)},0,1,1,${round3(r)},0`;
}

function crossPath(size: number): string {
  const r = Math.sqrt(size / 5) / 2;
  return polygon([-3 * r, -r, -r, -r, -r, -3 * r, r, -3 * r, r, -r, 3 * r, -r, 3 * r, r, r, r, r, 3 * r, -r, 3 * r, -r, r, -3 * r, r]);
}

function diamondPath(size: number): string {
  const y = Math.sqrt(size / (DIAMOND_TAN30 * 2));
  const x = y * DIAMOND_TAN30;
  return polygon([0, -y, x, 0, 0, y, -x, 0]);
}

function squarePath(size: number): string {
  const w = Math.sqrt(size);
  const x = -w / 2;
  return `M${round3(x)},${round3(x)}h${round3(w)}v${round3(w)}h${round3(-w)}Z`;
}

function starPath(size: number): string {
  const r = Math.sqrt(size * STAR_KA);
  const x = STAR_KX * r;
  const y = STAR_KY * r;
  const vertices = [0, -r, x, y];
  for (let i = 1; i < 5; i++) {
    const a = TAU * i / 5;
    const c = Math.cos(a);
    const s = Math.sin(a);
    vertices.push(s * r, -c * r, c * x - s * y, s * x + c * y);
  }
  return polygon(vertices);
}

/** d3-shape's symbolTriangle path for the given area */
export function trianglePath(size: number): string {
  const y = -Math.sqrt(size / (SQRT3 * 3));
  return polygon([0, y * 2, -SQRT3 * y, -y, SQRT3 * y, -y]);
}

function wyePath(size: number): string {
  const r = Math.sqrt(size / WYE_A);
  const x0 = r / 2;
  const y0 = r * WYE_K;
  const x1 = x0;
  const y1 = r * WYE_K + r;
  const x2 = -x1;
  const y2 = y1;
  return polygon([
    x0, y0,
    x1, y1,
    x2, y2,
    WYE_C * x0 - WYE_S * y0, WYE_S * x0 + WYE_C * y0,
    WYE_C * x1 - WYE_S * y1, WYE_S * x1 + WYE_C * y1,
    WYE_C * x2 - WYE_S * y2, WYE_S * x2 + WYE_C * y2,
    WYE_C * x0 + WYE_S * y0, WYE_C * y0 - WYE_S * x0,
    WYE_C * x1 + WYE_S * y1, WYE_C * y1 - WYE_S * x1,
    WYE_C * x2 + WYE_S * y2, WYE_C * y2 - WYE_S * x2
  ]);
}

const SYMBOLS: Readonly<Record<string, (size: number) => string>> = {
  Circle: circlePath,
  Cross: crossPath,
  Diamond: diamondPath,
  Square: squarePath,
  Star: starPath,
  Triangle: trianglePath,
  Wye: wyePath
};

/** d3-shape's fill symbols by name, centred on the origin and sized by area */
export function symbolPath(shape: string, size: number): string {
  const symbol = SYMBOLS[shape];
  if (symbol === undefined) {
    throw new Error(`Unknown symbol ${shape}`);
  }
  return symbol(size);
}
