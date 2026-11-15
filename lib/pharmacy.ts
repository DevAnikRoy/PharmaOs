import { connection } from "next/server";
import { redirect } from "next/navigation";
import { getDictionary, type Dictionary } from "@/lib/i18n/get-dictionary";
import { getLocale } from "@/lib/i18n/locale";
import type { Locale } from "@/lib/i18n/config";
import { createClient } from "@/lib/supabase/server";

export async function requirePharmacy(): Promise<{
  locale: Locale;
  dict: Dictionary;
  pharmacyName: string;
}> {
  await connection();
  const locale = await getLocale();
  const dict = getDictionary(locale);
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const { data: profile } = await supabase
    .from("users")
    .select("pharmacy_id")
    .eq("id", user.id)
    .maybeSingle();

  if (!profile) {
    redirect("/signup");
  }

  const { data: pharmacy } = await supabase
    .from("pharmacies")
    .select("name")
    .eq("id", profile.pharmacy_id)
    .single();

  if (!pharmacy) {
    redirect("/signup");
  }

  return { locale, dict, pharmacyName: pharmacy.name };
}