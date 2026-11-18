import Link from "next/link";
import { signOut } from "@/app/actions/auth";
import { LanguageSwitcher } from "@/components/language-switcher";
import { Button, buttonVariants } from "@/components/ui/button";
import type { Locale } from "@/lib/i18n/config";
import type { Dictionary } from "@/lib/i18n/get-dictionary";
import { cn } from "@/lib/utils";

type Props = {
  dict: Dictionary;
  locale: Locale;
  pharmacyName: string;
  active: "dashboard" | "medicines" | "stock";
  children: React.ReactNode;
};

export function DashboardFrame({
  dict,
  locale,
  pharmacyName,
  active,
  children,
}: Props) {
  return (
    <div className="mx-auto flex w-full max-w-5xl flex-col gap-8 p-6">
      <header className="flex flex-col gap-4 border-b pb-4">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <p className="text-sm text-muted-foreground">{dict.appName}</p>
            <p className="text-lg font-medium">{pharmacyName}</p>
          </div>
          <div className="flex items-center gap-3">
            <LanguageSwitcher locale={locale} dict={dict} />
            <form action={signOut}>
              <Button type="submit" variant="outline">{dict.logout}</Button>
            </form>
          </div>
        </div>
        <nav className="flex flex-wrap gap-2">
          <Link
            href="/dashboard"
            className={cn(
              buttonVariants({
                variant: active === "dashboard" ? "default" : "outline",
                size: "sm",
              }),
            )}
          >
            {dict.navDashboard}
          </Link>
          <Link
            href="/dashboard/medicines"
            className={cn(
              buttonVariants({
                variant: active === "medicines" ? "default" : "outline",
                size: "sm",
              }),
            )}
          >
            {dict.navMedicines}
          </Link>
          <Link
            href="/dashboard/stock"
            className={cn(buttonVariants({ variant: active === "stock" ? "default" : "outline", size: "sm" }))}
          >
            {dict.navStock}
          </Link>
        </nav>
      </header>
      {children}
    </div>
  );
}
