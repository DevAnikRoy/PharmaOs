"use client";

import { useState, useTransition } from "react";
import { completeSetup, signOut } from "@/app/actions/auth";
import { LanguageSwitcher } from "@/components/language-switcher";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import type { Dictionary } from "@/lib/i18n/get-dictionary";
import type { Locale } from "@/lib/i18n/config";

export function SetupForm({ dict, locale, pharmacyName, initialError }: {
  dict: Dictionary; locale: Locale; pharmacyName: string; initialError: boolean;
}) {
  const [failed, setFailed] = useState(initialError);
  const [pending, startTransition] = useTransition();
  return <Card className="w-full max-w-md">
    <CardHeader className="space-y-4">
      <LanguageSwitcher locale={locale} dict={dict} />
      <CardTitle>{dict.setupTitle}</CardTitle>
      <CardDescription>{dict.setupDescription}</CardDescription>
    </CardHeader>
    <CardContent className="space-y-4">
      <form className="space-y-4" action={(data) => {
        setFailed(false);
        startTransition(async () => {
          const result = await completeSetup(data);
          if (result?.error) setFailed(true);
        });
      }}>
        {failed && <p role="alert" className="text-sm text-destructive">{dict.setupError}</p>}
        <Label htmlFor="pharmacyName">{dict.pharmacyName}</Label>
        <Input id="pharmacyName" name="pharmacyName" required defaultValue={pharmacyName} />
        <Button type="submit" disabled={pending}>{dict.finishSetup}</Button>
      </form>
      <form action={signOut}><Button type="submit" variant="outline">{dict.logout}</Button></form>
    </CardContent>
  </Card>;
}
