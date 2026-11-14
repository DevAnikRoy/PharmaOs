"use client";

import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import type { Locale } from "@/lib/i18n/config";
import { LOCALE_COOKIE } from "@/lib/i18n/config";
import type { Dictionary } from "@/lib/i18n/get-dictionary";

type Props = {
  locale: Locale;
  dict: Dictionary;
};

export function LanguageSwitcher({ locale, dict }: Props) {
  const router = useRouter();

  function setLocale(next: Locale) {
    document.cookie = `${LOCALE_COOKIE}=${next};path=/;max-age=31536000;SameSite=Lax`;
    router.refresh();
  }

  return (
    <div className="flex items-center gap-1" role="group" aria-label={dict.language}>
      <Button
        type="button"
        variant={locale === "en" ? "default" : "outline"}
        size="sm"
        onClick={() => setLocale("en")}
      >
        {dict.english}
      </Button>
      <Button
        type="button"
        variant={locale === "bn" ? "default" : "outline"}
        size="sm"
        onClick={() => setLocale("bn")}
      >
        {dict.bangla}
      </Button>
    </div>
  );
}