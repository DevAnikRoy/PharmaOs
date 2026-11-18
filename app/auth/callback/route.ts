import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  // Only permit destinations within the protected app.
  const requested = searchParams.get("next") ?? "/dashboard";
  const next = requested === "/dashboard" || requested.startsWith("/dashboard/")
    ? requested : "/dashboard";
  if (!code) return NextResponse.redirect(`${origin}/login?error=confirmation`);

  const supabase = await createClient();
  const { error } = await supabase.auth.exchangeCodeForSession(code);
  if (error) return NextResponse.redirect(`${origin}/login?error=confirmation`);

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.redirect(`${origin}/login?error=confirmation`);
  const { data: profile, error: profileError } = await supabase
    .from("users").select("id").eq("id", user.id).maybeSingle();
  if (profileError) return NextResponse.redirect(`${origin}/setup?error=setup`);

  if (!profile) {
    const name = user.user_metadata?.pharmacy_name;
    if (typeof name !== "string" || !name.trim()) {
      return NextResponse.redirect(`${origin}/setup`);
    }
    const { error: setupError } = await supabase.rpc("complete_owner_signup", {
      pharmacy_name: name, owner_full_name: null,
    });
    if (setupError) return NextResponse.redirect(`${origin}/setup?error=setup`);
  }
  return NextResponse.redirect(new URL(next, origin));
}
