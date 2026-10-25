import at from "../util/at";
import { describe, expect, it } from "vitest";
import { createDefaultValues, type SettingCard, type SettingsValues } from "../settings/definitions";
import type createCanvasCard from "../settings/createCanvasCard";
import settingsReference from "../settings/settingsReference";
import buildFormattingModel from "../powerbi/buildFormattingModel";
import readSettingsRows from "../powerbi/readSettingsRows";
import capabilitiesMismatches, { type CapabilitiesObjects } from "./capabilities";

type CanvasModel = Record<string, SettingCard> & { readonly canvas: ReturnType<typeof createCanvasCard> };

/** Each card's settings table matches its page under the docs directory; regenerate with `npx vitest run -u` */
export function settingsReferenceSuite(settingsModel: Record<string, SettingCard>, directory: string): void {
  describe("settings reference docs", () => {
    const pages = settingsReference(settingsModel);
    const cards = Object.keys(pages);
    for (let i = 0; i < cards.length; i++) {
      const card = at(cards, i);
      it(`matches the docs for ${card}`, async () => {
        await expect(pages[card]).toMatchFileSnapshot(`${directory}/${card}.md`);
      });
    }
  });
}

/** Every setting persists under its card with its component's type, beside only the named other objects */
export function capabilitiesSuite(settingsModel: Record<string, SettingCard>, capabilities: { objects: CapabilitiesObjects },
                                  otherObjects: readonly string[] = []): void {
  it("mirrors the settings model in capabilities.json", () => {
    expect(capabilitiesMismatches(settingsModel, capabilities.objects, otherObjects)).toEqual([]);
  });
}

/** The visual's settings model round-trips through the installed Core package */
export function formattingContractsSuite<M extends CanvasModel>(settingsModel: M, defaultSettings: SettingsValues<M>): void {
  it("resolves the formatting contracts through the installed Core package", () => {
    const defaults = createDefaultValues(settingsModel);
    expect(defaultSettings).toEqual(defaults);
    const rows = readSettingsRows(settingsModel.canvas, "canvas", defaultSettings.canvas, {
      objects: [{ canvas: { lower_padding: 0, show_errors: false } }]
    }, [0]);
    expect(rows.values[0]).toMatchObject({ lower_padding: 0, show_errors: false });
    const pane = buildFormattingModel(settingsModel, { ...defaults, canvas: rows.values[0] });
    expect(at(pane.cards, 0).uid).toBe("canvas_card_uid");
    expect(pane.cards).toHaveLength(Object.keys(defaultSettings).length);
  });
}
