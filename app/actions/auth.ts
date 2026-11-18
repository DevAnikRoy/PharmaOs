"use server";

import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

export async function signOut() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect("/login");
}

export type AuthResult = { error?: string; needsEmailConfirmation?: boolean };

export async function signUp(formData: FormData): Promise<AuthResult> {
  const email = String(formData.get("email") ?? "").trim();
  const password = String(formData.get("password") ?? "");
  const pharmacyName = String(formData.get("pharmacyName") ?? "").trim();

  if (!email || !password || !pharmacyName) {
    return { error: "All fields are required." };
  }

  const supabase = await createClient();

  const origin = process.env.NEXT_PUBLIC_SITE_URL || (await headers()).get("origin");

  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      data: { pharmacy_name: pharmacyName },
      ...(origin ? { emailRedirectTo: new URL("/auth/callback", origin).toString() } : {}),
    },
  });

  if (error) {
    return { error: error.message };
  }

  if (!data.session) {
    return { needsEmailConfirmation: true };
  }

  const { error: rpcError } = await supabase.rpc("complete_owner_signup", {
    pharmacy_name: pharmacyName,
    owner_full_name: null,
  });

  if (rpcError) {
    redirect("/setup?error=setup");
  }

  redirect("/dashboard");
}

export async function signIn(formData: FormData): Promise<AuthResult> {
  const email = String(formData.get("email") ?? "").trim();
  const password = String(formData.get("password") ?? "");

  if (!email || !password) {
    return { error: "Email and password are required." };
  }

  const supabase = await createClient();

  const { error } = await supabase.auth.signInWithPassword({ email, password });

  if (error) {
    return { error: error.message };
  }

  redirect("/dashboard");
}

export async function completeSetup(formData: FormData): Promise<AuthResult> {
  const pharmacyName = String(formData.get("pharmacyName") ?? "").trim();
  if (!pharmacyName) return { error: "Pharmacy name is required." };
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");
  const { error } = await supabase.rpc("complete_owner_signup", {
    pharmacy_name: pharmacyName,
    owner_full_name: null,
  });
  if (error) return { error: "Could not finish pharmacy setup. Please try again." };
  redirect("/dashboard");
}


export async function resendConfirmation(formData: FormData): Promise<{ error?: boolean }> {
  const email = String(formData.get("email") ?? "").trim();
  if (!email) return { error: true };
  const origin = process.env.NEXT_PUBLIC_SITE_URL || (await headers()).get("origin");
  const supabase = await createClient();
  const { error } = await supabase.auth.resend({
    type: "signup", email,
    ...(origin ? { options: { emailRedirectTo: new URL("/auth/callback", origin).toString() } } : {}),
  });
  return error ? { error: true } : {};
}
