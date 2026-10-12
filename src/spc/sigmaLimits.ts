import rep from "../math/rep";
import type { LimitLineValues } from "../settings/lineSettings";

export type SigmaLimitSeries = LimitLineValues<number[]> & { target: number[] };

export type SigmaLimitOptions = {
  /** One sigma for every point, or each point's own */
  sigma: number | ((index: number) => number);
  /** Drawn as the centreline when it differs from the centre the limits surround */
  target?: number;
  /** Lower limits never fall below this */
  floor?: number;
  /** Upper limits never rise above this */
  ceiling?: number;
};

/** Limits one, two and three sigma either side of the centre */
export default function sigmaLimits(n: number, centre: number, options: SigmaLimitOptions): SigmaLimitSeries {
  const sigma = options.sigma;
  const floor = options.floor ?? -Infinity;
  const ceiling = options.ceiling ?? Infinity;
  const limits: SigmaLimitSeries = {
    target: rep(options.target ?? centre, n),
    ll99: new Array<number>(n),
    ll95: new Array<number>(n),
    ll68: new Array<number>(n),
    ul68: new Array<number>(n),
    ul95: new Array<number>(n),
    ul99: new Array<number>(n)
  };
  for (let i = 0; i < n; i++) {
    const s = typeof sigma === "number" ? sigma : sigma(i);
    limits.ll99[i] = Math.max(floor, centre - 3 * s);
    limits.ll95[i] = Math.max(floor, centre - 2 * s);
    limits.ll68[i] = Math.max(floor, centre - s);
    limits.ul68[i] = Math.min(ceiling, centre + s);
    limits.ul95[i] = Math.min(ceiling, centre + 2 * s);
    limits.ul99[i] = Math.min(ceiling, centre + 3 * s);
  }
  return limits;
}
