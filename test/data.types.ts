import { formatNumber } from "../src/data/index";
import { formatPrimitiveValue, indexColumnsByRole } from "../src/powerbi/index";
// @ts-expect-error Scalar formatting does not broadcast.
formatPrimitiveValue([1, 2]);
// @ts-expect-error Missing formatted values must be handled at the display boundary.
const text: string = formatNumber(undefined, 2, "");
const roles = indexColumnsByRole([{ source: { roles: { numeric: true } }, values: [1] }]);
// @ts-expect-error Roles are not necessarily assigned.
roles.numeric[0].values;
