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

  const { data: profile, error: profileError } = await supabase
    .from("users")
    .select("pharmacy_id")
    .eq("id", user.id)
    .maybeSingle();

  if (profileError) throw new Error(profileError.message);

  if (!profile) {
    redirect("/setup");
  }

  const { data: pharmacy, error: pharmacyError } = await supabase
    .from("pharmacies")
    .select("name")
    .eq("id", profile.pharmacy_id)
    .single();

  if (pharmacyError) throw new Error(pharmacyError.message);

  if (!pharmacy) {
    redirect("/setup");
  }

  return { locale, dict, pharmacyName: pharmacy.name };
}