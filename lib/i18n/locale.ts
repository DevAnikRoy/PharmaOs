import { cookies } from "next/headers";
import { LOCALE_COOKIE, defaultLocale, parseLocale, type Locale } from "./config";

export async function getLocale(): Promise<Locale> {
  const cookieStore = await cookies();
  const value = cookieStore.get(LOCALE_COOKIE)?.value;
  return parseLocale(value ?? defaultLocale);
}