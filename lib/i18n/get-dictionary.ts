import type { Locale } from "./config";
import en from "./messages/en.json";
import bn from "./messages/bn.json";

export type Dictionary = typeof en;

const dictionaries: Record<Locale, Dictionary> = { en, bn };

export function getDictionary(locale: Locale): Dictionary {
  return dictionaries[locale] ?? dictionaries.en;
}