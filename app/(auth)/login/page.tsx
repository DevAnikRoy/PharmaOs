export const instant = false;

import { LoginForm } from "@/components/auth/login-form";
import { getDictionary } from "@/lib/i18n/get-dictionary";
import { getLocale } from "@/lib/i18n/locale";

export default async function LoginPage({ searchParams }: { searchParams: Promise<{ error?: string }> }) {
  const locale = await getLocale();
  const dict = getDictionary(locale);

  const params = await searchParams;
  return <LoginForm locale={locale} dict={dict} confirmationError={params.error === "confirmation"} />;
}