"use client";

import Link from "next/link";
import { useState, useTransition } from "react";
import { resendConfirmation, signIn } from "@/app/actions/auth";
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
  confirmationError?: boolean;
};

export function LoginForm({ locale, dict, confirmationError }: Props) {
  const [error, setError] = useState<string | null>(confirmationError ? dict.confirmationError : null);
  const [confirmationSent, setConfirmationSent] = useState(false);
  const [pending, startTransition] = useTransition();

  return (
    <Card className="w-full max-w-md">
      <CardHeader className="space-y-4">
        <div className="flex items-start justify-between gap-4">
          <div>
            <CardTitle>{dict.loginTitle}</CardTitle>
            <CardDescription>{dict.loginSubtitle}</CardDescription>
          </div>
          <LanguageSwitcher locale={locale} dict={dict} />
        </div>
      </CardHeader>
      <form
        action={(formData) => {
          setError(null);
          startTransition(async () => {
            const result = await signIn(formData);
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
          {confirmationSent && <p role="status" className="text-sm text-muted-foreground">{dict.confirmationSent}</p>}
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
              autoComplete="current-password"
              required
            />
          </div>
        </CardContent>
        <CardFooter className="flex flex-col gap-4">
          <Button type="submit" className="w-full" disabled={pending}>
            {dict.loginButton}
          </Button>
          <Button type="submit" variant="outline" className="w-full" disabled={pending}
            formNoValidate formAction={(data) => {
              setError(null);
              setConfirmationSent(false);
              startTransition(async () => {
                const result = await resendConfirmation(data);
                if (result.error) setError(dict.resendError);
                else setConfirmationSent(true);
              });
            }}>{dict.resendConfirmation}</Button>
          <p className="text-center text-sm text-muted-foreground">
            {dict.noAccount}{" "}
            <Link href="/signup" className="text-primary underline-offset-4 hover:underline">
              {dict.goSignup}
            </Link>
          </p>
        </CardFooter>
      </form>
    </Card>
  );
}