export type OrderedBoundsSettings = {
  readonly x_axis: { readonly xlimit_l: number | undefined; readonly xlimit_u: number | undefined };
  readonly y_axis: { readonly ylimit_l: number | undefined; readonly ylimit_u: number | undefined };
};

export type TruncationSettings = { readonly ll_truncate: number | undefined; readonly ul_truncate: number | undefined };

/** An error when both bounds are set and the lower is not below the upper */
export function orderedPairError(lowerName: string, lower: number | undefined, upperName: string, upper: number | undefined): string | undefined {
  if (lower !== undefined && upper !== undefined && lower >= upper) {
    return `${lowerName} (${lower}) must be below ${upperName} (${upper})`;
  }
  return undefined;
}

/** An error for the first lower bound not below its upper bound: limit truncation, then the axis limits */
export default function orderedBoundsError(settings: OrderedBoundsSettings, truncation: TruncationSettings): string | undefined {
  return orderedPairError("ll_truncate", truncation.ll_truncate, "ul_truncate", truncation.ul_truncate)
    ?? orderedPairError("xlimit_l", settings.x_axis.xlimit_l, "xlimit_u", settings.x_axis.xlimit_u)
    ?? orderedPairError("ylimit_l", settings.y_axis.ylimit_l, "ylimit_u", settings.y_axis.ylimit_u);
}
