import at from "../util/at";
import type { FlagDirection } from "./flagDirection";

type RaisedFlag = Exclude<FlagDirection, "none">;

export type FlaggedAesthetics = {
  colour: string;
  colour_outline: string;
  scatter_text_colour?: string;
};

/** Fill and outline take the colour of the last raised flag; group text, where the visual draws it, follows */
export default function applyFlagColours<P extends string>(
  aesthetics: FlaggedAesthetics,
  colours: Readonly<Record<`${P}_${RaisedFlag}`, string>>,
  flags: readonly (readonly [FlagDirection, P])[]
): void {
  let colour: string | undefined;
  for (let i = 0; i < flags.length; i++) {
    const [status, prefix] = at(flags, i);
    if (status !== "none") {
      colour = colours[`${prefix}_${status}` as const];
    }
  }
  if (colour === undefined) {
    return;
  }
  aesthetics.colour = colour;
  aesthetics.colour_outline = colour;
  if (aesthetics.scatter_text_colour !== undefined) {
    aesthetics.scatter_text_colour = colour;
  }
}
