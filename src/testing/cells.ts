import type powerbi from "powerbi-visuals-api";
import type { PrimitiveValue } from "../powerbi/columns";

// Power BI sends null for blank and unhighlighted cells, which powerbi-visuals-api's PrimitiveValue omits
export default function cells(values: PrimitiveValue[]): powerbi.PrimitiveValue[] {
  return values as powerbi.PrimitiveValue[];
}
