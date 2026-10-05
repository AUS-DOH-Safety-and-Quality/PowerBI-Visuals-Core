import { min, max, mean, between, rep, clamp } from "../src/math/index.js";
import { isValidNumber, isNullOrUndefined, groupBy } from "../src/data/index.js";

const frozen: readonly number[] = Object.freeze([1, 2]);
min(frozen);
max(frozen);
mean(frozen);
// @ts-expect-error Reductions take an explicit array, never a scalar.
min(1);
// @ts-expect-error Missing values must be validated before numerical reduction.
max([1, undefined]);
between(1, undefined, 2);
clamp(1, 0, undefined);
// @ts-expect-error Both bounds must be stated explicitly, even when open.
clamp(1, 0);
// @ts-expect-error The clamp is scalar; callers loop over arrays.
clamp([1, 2], 0, 1);
const repeated: string[] = rep("none", 3);
repeated.length;

const maybe: number | undefined = Math.random() > 0.5 ? 1 : undefined;
if (isValidNumber(maybe)) {
  const narrowed: number = maybe;
  narrowed.toFixed(1);
}
const mixed: string | number | null = Math.random() > 0.5 ? "1" : null;
if (!isNullOrUndefined(mixed)) {
  const present: string | number = mixed;
  String(present);
}
if (isValidNumber(mixed)) {
  const numeric: number = mixed;
  numeric.toFixed(1);
}

type Line = { x: number, group: "target" | "ll99" };
const lines: readonly Line[] = [{ x: 1, group: "target" }];
const grouped: [Line["group"], Line[]][] = groupBy(lines, "group");
grouped.length;
// @ts-expect-error Group keys are typed by the grouped property, not as strings.
const loose: [string, Line[]][] = groupBy(lines, "x");
loose.length;
// @ts-expect-error The grouping key must be a property of the row type.
groupBy(lines, "missing");
