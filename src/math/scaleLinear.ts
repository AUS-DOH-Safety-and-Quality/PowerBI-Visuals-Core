/** Adapted from the tickSpec function in the d3-array package */
function tickSpec(start: number, stop: number, count: number): [number, number, number] {
  const step = (stop - start) / count;
  const power = Math.floor(Math.log10(step));
  const error = step / Math.pow(10, power);
  const factor = error >= Math.sqrt(50) ? 10 : error >= Math.sqrt(10) ? 5 : error >= Math.sqrt(2) ? 2 : 1;

  let i1: number;
  let i2: number;
  let inc: number;
  if (power < 0) {
    inc = Math.pow(10, -power) / factor;
    i1 = Math.round(start * inc);
    i2 = Math.round(stop * inc);
    if (i1 / inc < start) {
      ++i1;
    }
    if (i2 / inc > stop) {
      --i2;
    }
    inc = -inc;
  } else {
    inc = Math.pow(10, power) * factor;
    i1 = Math.round(start / inc);
    i2 = Math.round(stop / inc);
    if (i1 * inc < start) {
      ++i1;
    }
    if (i2 * inc > stop) {
      --i2;
    }
  }
  if (i2 < i1 && 0.5 <= count && count < 2) {
    return tickSpec(start, stop, count * 2);
  }
  return [i1, i2, inc];
}

export interface LinearScale {
  (value: number): number;
  domain(): number[];
  domain(values: readonly [number, number]): LinearScale;
  range(): number[];
  range(values: readonly [number, number]): LinearScale;
  invert(value: number): number;
  copy(): LinearScale;
  ticks(count?: number): number[];
}

/** Equal domain endpoints map every input to the midpoint of the range. */
export default function scaleLinear(): LinearScale {
  let domain: readonly [number, number] = [0, 1];
  let range: readonly [number, number] = [0, 1];

  function scale(x: number): number {
    const d0 = domain[0];
    const d1 = domain[1];
    const r0 = range[0];
    const r1 = range[1];
    return r0 + (r1 - r0) * (d0 === d1 ? 0.5 : (x - d0) / (d1 - d0));
  }

  function setDomain(): number[];
  function setDomain(newDomain: readonly [number, number]): LinearScale;
  function setDomain(newDomain?: readonly [number, number]): number[] | LinearScale {
    if (newDomain === undefined) {
      return domain.slice();
    }
    domain = newDomain;
    return scale;
  }
  scale.domain = setDomain;

  function setRange(): number[];
  function setRange(newRange: readonly [number, number]): LinearScale;
  function setRange(newRange?: readonly [number, number]): number[] | LinearScale {
    if (newRange === undefined) {
      return range.slice();
    }
    range = newRange;
    return scale;
  }
  scale.range = setRange;

  scale.invert = function(y: number): number {
    const d0 = domain[0];
    const d1 = domain[1];
    const r0 = range[0];
    const r1 = range[1];
    return d0 + (d1 - d0) * ((y - r0) / (r1 - r0));
  };

  scale.copy = function(): LinearScale {
    return scaleLinear().domain(domain).range(range);
  };

  scale.ticks = function(count: number = 10): number[] {
    const d0 = domain[0];
    const d1 = domain[1];
    if (count <= 0) {
      return [];
    }
    if (d0 === d1) {
      return [d0];
    }
    const spec = tickSpec(d0, d1, count);
    const i1 = spec[0];
    const i2 = spec[1];
    const inc = spec[2];
    if (!(i2 >= i1)) {
      return [];
    }
    const n = i2 - i1 + 1;
    const ticks = new Array<number>(n);
    // A negative increment is the reciprocal of a fractional step; dividing by it keeps ticks such as 0.3 exact
    for (let i = 0; i < n; ++i) {
      ticks[i] = inc < 0 ? (i1 + i) / -inc : (i1 + i) * inc;
    }
    return ticks;
  };

  return scale;
}
