export const instant = false;

import Link from "next/link";
import { redirect } from "next/navigation";
import { LanguageSwitcher } from "@/components/language-switcher";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { createClient } from "@/lib/supabase/server";
import { getDictionary } from "@/lib/i18n/get-dictionary";
import { getLocale } from "@/lib/i18n/locale";

export default async function DashboardPage() {
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

  if (profileError || !profile) {
    redirect("/signup");
  }

  const { data: pharmacy, error: pharmacyError } = await supabase
    .from("pharmacies")
    .select("name")
    .eq("id", profile.pharmacy_id)
    .single();

  if (pharmacyError || !pharmacy) {
    redirect("/signup");
  }

  return (
    <DashboardShell dict={dict} locale={locale} pharmacyName={pharmacy.name} />
  );
}

function DashboardShell({
  dict,
  locale,
  pharmacyName,
}: {
  dict: ReturnType<typeof getDictionary>;
  locale: Awaited<ReturnType<typeof getLocale>>;
  pharmacyName: string;
}) {
  return (
    <div className="mx-auto flex max-w-3xl flex-col gap-8 p-6">
      <header className="flex flex-wrap items-center justify-between gap-4 border-b pb-4">
        <div>
          <p className="text-sm text-muted-foreground">{dict.appName}</p>
          <h1 className="text-2xl font-semibold tracking-tight">{dict.dashboardTitle}</h1>
        </div>
        <div className="flex items-center gap-3">
          <LanguageSwitcher locale={locale} dict={dict} />
          <Link
            href="/logout"
            className={cn(buttonVariants({ variant: "outline", size: "default" }))}
          >
            {dict.logout}
          </Link>
        </div>
      </header>
      <section className="rounded-lg border bg-card p-6 text-card-foreground shadow-sm">
        <p className="text-sm text-muted-foreground">{dict.welcomePharmacy}</p>
        <p className="mt-2 text-xl font-medium">{pharmacyName}</p>
      </section>
    </div>
  );
}