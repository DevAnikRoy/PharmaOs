# APP_FLOW — PharmaOS

## Foundation routes

| Path | Who | What happens |
|------|-----|----------------|
| `/` | Anyone | Redirect to `/dashboard` if logged in, else `/login` |
| `/signup` | Guest | Create auth user → create pharmacy → owner profile → `/dashboard` |
| `/login` | Guest | Email/password → `/dashboard` |
| `/logout` | Logged in | Sign out → `/login` |
| `/dashboard` | Owner | Show pharmacy name, language toggle, logout |

## Signup (detailed)

1. User enters pharmacy name, email, password (optional display name TO DECIDE).
2. App calls Supabase `signUp`.
3. If session is returned, app calls RPC `complete_owner_signup(pharmacy_name)`.
4. If email confirmation is required, show message — TO DECIDE per Supabase project settings.

## Future flows (not built)

- Add medicine, receive stock, sell, low-stock alerts, AI help — see [IMPLEMENTATION_PLAN.md](./IMPLEMENTATION_PLAN.md).

## i18n

English default; user can switch to Bangla. Copy lives in `lib/i18n/messages/`. Details: [DESIGN_SPEC.md](./DESIGN_SPEC.md).