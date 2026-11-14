"use client";

import Link from "next/link";
import { useState, useTransition } from "react";
import { signUp } from "@/app/actions/auth";
import { LanguageSwitcher } from "@/components/language-switcher";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import type { Locale } from "@/lib/i18n/config";
import type { Dictionary } from "@/lib/i18n/get-dictionary";

type Props = {
  locale: Locale;
  dict: Dictionary;
};

export function SignupForm({ locale, dict }: Props) {
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  return (
    <Card className="w-full max-w-md">
      <CardHeader className="space-y-4">
        <div className="flex items-start justify-between gap-4">
          <div>
            <CardTitle>{dict.signupTitle}</CardTitle>
            <CardDescription>{dict.signupSubtitle}</CardDescription>
          </div>
          <LanguageSwitcher locale={locale} dict={dict} />
        </div>
      </CardHeader>
      <form
        action={(formData) => {
          setError(null);
          setInfo(null);
          startTransition(async () => {
            const result = await signUp(formData);
            if (result?.needsEmailConfirmation) {
              setInfo(dict.checkEmail);
              return;
            }
            if (result?.error) {
              setError(result.error);
            }
          });
        }}
      >
        <CardContent className="space-y-4">
          {error && (
            <p className="text-sm text-destructive" role="alert">
              {error}
            </p>
          )}
          {info && (
            <p className="text-sm text-muted-foreground" role="status">
              {info}
            </p>
          )}
          <div className="space-y-2">
            <Label htmlFor="pharmacyName">{dict.pharmacyName}</Label>
            <Input id="pharmacyName" name="pharmacyName" required />
          </div>
          <div className="space-y-2">
            <Label htmlFor="email">{dict.email}</Label>
            <Input
              id="email"
              name="email"
              type="email"
              autoComplete="email"
              required
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="password">{dict.password}</Label>
            <Input
              id="password"
              name="password"
              type="password"
              autoComplete="new-password"
              minLength={6}
              required
            />
          </div>
        </CardContent>
        <CardFooter className="flex flex-col gap-4">
          <Button type="submit" className="w-full" disabled={pending}>
            {dict.signupButton}
          </Button>
          <p className="text-center text-sm text-muted-foreground">
            {dict.hasAccount}{" "}
            <Link href="/login" className="text-primary underline-offset-4 hover:underline">
              {dict.goLogin}
            </Link>
          </p>
        </CardFooter>
      </form>
    </Card>
  );
}