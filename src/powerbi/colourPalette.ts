export type ColourPalette = {
  isHighContrast: boolean;
  foregroundColour: string;
  backgroundColour: string;
  foregroundSelectedColour: string;
  hyperlinkColour: string;
};

// The slice of IVisualHost.colorPalette the visuals use, without importing the API
export type PaletteHost = {
  readonly colorPalette: {
    readonly isHighContrast: boolean;
    readonly foreground: { readonly value: string };
    readonly background: { readonly value: string };
    readonly foregroundSelected: { readonly value: string };
    readonly hyperlink: { readonly value: string };
  };
};

// Read on every update so theme changes reach error text as well as the plot
export function readColourPalette(host: PaletteHost): ColourPalette {
  const palette = host.colorPalette;
  return {
    isHighContrast: palette.isHighContrast,
    foregroundColour: palette.foreground.value,
    backgroundColour: palette.background.value,
    foregroundSelectedColour: palette.foregroundSelected.value,
    hyperlinkColour: palette.hyperlink.value
  };
}
