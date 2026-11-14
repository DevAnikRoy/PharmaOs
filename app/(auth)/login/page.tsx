export const instant = false;

import { LoginForm } from "@/components/auth/login-form";
import { getDictionary } from "@/lib/i18n/get-dictionary";
import { getLocale } from "@/lib/i18n/locale";

export default async function LoginPage() {
  const locale = await getLocale();
  const dict = getDictionary(locale);

  return <LoginForm locale={locale} dict={dict} />;
}