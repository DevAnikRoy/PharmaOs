export const LOCALE_COOKIE = "pharmaos_locale";

export type Locale = "en" | "bn";

export const defaultLocale: Locale = "en";

export const locales: Locale[] = ["en", "bn"];

export function parseLocale(value: string | undefined): Locale {
  if (value === "bn") return "bn";
  return "en";
}