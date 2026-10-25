export type SettingsOverrides<S> = { readonly [K in keyof S]?: Partial<S[K]> | undefined };

/** The defaults with each overridden card merged over its default values */
export default function settingsWith<S extends Readonly<Record<string, object>>>(defaults: S, overrides: SettingsOverrides<S>): S {
  const result: Record<string, object> = { ...defaults };
  const cards = Object.keys(overrides);
  for (let i = 0; i < cards.length; i++) {
    const key = cards[i];
    result[key] = { ...defaults[key], ...overrides[key] };
  }
  return result as S;
}
