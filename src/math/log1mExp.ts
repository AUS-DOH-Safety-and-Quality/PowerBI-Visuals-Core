/** log(1 - exp(x)) without cancellation, switching method at -ln 2; adapted from R's R_Log1_Exp. */
export default function log1mExp(x: number): number {
  return (x > -Math.LN2) ? Math.log(-Math.expm1(x)) : Math.log1p(-Math.exp(x));
}
