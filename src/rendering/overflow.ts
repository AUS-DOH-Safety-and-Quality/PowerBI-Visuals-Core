export type PlotPadding = {
  readonly left: number;
  readonly right: number;
  readonly top: number;
  readonly bottom: number;
};

export type Box = {
  readonly x: number;
  readonly y: number;
  readonly width: number;
  readonly height: number;
};

// Each side's padding grows by its overflow; undefined when nothing overflows
export function adjustPaddingForOverflow(bbox: Box, width: number, height: number, padding: PlotPadding): PlotPadding | undefined {
  const left = Math.abs(Math.min(0, bbox.x));
  const right = Math.max(0, bbox.width + bbox.x - width);
  const top = Math.abs(Math.min(0, bbox.y));
  const bottom = Math.max(0, bbox.height + bbox.y - height);
  if (left === 0 && right === 0 && top === 0 && bottom === 0) {
    return undefined;
  }
  return {
    left: padding.left + left,
    right: padding.right + right,
    top: padding.top + top,
    bottom: padding.bottom + bottom
  };
}
