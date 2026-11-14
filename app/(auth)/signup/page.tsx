export const instant = false;

import { SignupForm } from "@/components/auth/signup-form";
import { getDictionary } from "@/lib/i18n/get-dictionary";
import { getLocale } from "@/lib/i18n/locale";

export default async function SignupPage() {
  const locale = await getLocale();
  const dict = getDictionary(locale);

  return <SignupForm locale={locale} dict={dict} />;
}