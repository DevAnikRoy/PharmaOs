export const instant = false;

import { redirect } from "next/navigation";
import { SetupForm } from "@/components/auth/setup-form";
import { createClient } from "@/lib/supabase/server";
import { getLocale } from "@/lib/i18n/locale";
import { getDictionary } from "@/lib/i18n/get-dictionary";

export default async function SetupPage({ searchParams }: { searchParams: Promise<{ error?: string }> }) {
  const locale = await getLocale();
  const dict = getDictionary(locale);
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");
  const { data: profile, error } = await supabase.from("users")
    .select("id").eq("id", user.id).maybeSingle();
  if (error) throw new Error(error.message);
  if (profile) redirect("/dashboard");
  const name = user.user_metadata?.pharmacy_name;
  const params = await searchParams;
  return <SetupForm dict={dict} locale={locale}
    pharmacyName={typeof name === "string" ? name : ""} initialError={params.error === "setup"} />;
}
