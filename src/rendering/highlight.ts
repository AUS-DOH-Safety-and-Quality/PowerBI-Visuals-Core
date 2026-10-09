export type HighlightOpacities = {
  readonly opacity: number;
  readonly opacity_selected: number;
  readonly opacity_unselected: number;
};

// Default opacity until a selection or highlight is active, then selected or unselected
export function highlightOpacity(opacities: HighlightOpacities, active: boolean, emphasised: boolean): number {
  if (!active) {
    return opacities.opacity;
  }
  return emphasised ? opacities.opacity_selected : opacities.opacity_unselected;
}
