export type OrderedBoundsSettings = {
  readonly x_axis: { readonly xlimit_l: number | undefined; readonly xlimit_u: number | undefined };
  readonly y_axis: { readonly ylimit_l: number | undefined; readonly ylimit_u: number | undefined };
};

export type TruncationSettings = { readonly ll_truncate: number | undefined; readonly ul_truncate: number | undefined };

/** An error for the first lower bound not below its upper bound: limit truncation, then the axis limits */
export default function orderedBoundsError(settings: OrderedBoundsSettings, truncation: TruncationSettings): string | undefined {
  const bounds = [
    ["ll_truncate", truncation.ll_truncate, "ul_truncate", truncation.ul_truncate],
    ["xlimit_l", settings.x_axis.xlimit_l, "xlimit_u", settings.x_axis.xlimit_u],
    ["ylimit_l", settings.y_axis.ylimit_l, "ylimit_u", settings.y_axis.ylimit_u]
  ] as const;
  for (let i = 0; i < bounds.length; i++) {
    const lower = bounds[i][1];
    const upper = bounds[i][3];
    if (lower !== undefined && upper !== undefined && lower >= upper) {
      return `${bounds[i][0]} (${lower}) must be below ${bounds[i][2]} (${upper})`;
    }
  }
  return undefined;
}
