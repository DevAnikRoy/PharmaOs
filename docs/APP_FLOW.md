# APP_FLOW — PharmaOS

## Foundation routes

| Path | Who | What happens |
|------|-----|----------------|
| `/` | Anyone | Redirect to `/dashboard` if logged in, else `/login` |
| `/signup` | Guest | Create auth user → create pharmacy → owner profile → `/dashboard` |
| `/login` | Guest | Email/password → `/dashboard` |
| `/logout` | Logged in | Sign out → `/login` |
| `/dashboard` | Owner | Show pharmacy name, language toggle, logout |
| `/dashboard/medicines` | Owner | Search brand or generic, open other brands, set this shop's price, add a medicine |

## Signup (detailed)

1. User enters pharmacy name, email, password (optional display name TO DECIDE).
2. App calls Supabase `signUp`.
3. If session is returned, app calls RPC `complete_owner_signup(pharmacy_name)`.
4. If email confirmation is required, show message — TO DECIDE per Supabase project settings.

## Medicines

1. Owner opens Medicines and types a brand (`Napa`) or generic (`paracetamol`), in English or Bangla.
2. Matching rows show this pharmacy's price, or "price not set".
3. Opening a row lists other brands of the same generic. The owner can type a price for any of them.
4. Add medicine saves the shared catalog row if it is new, then saves this pharmacy's price.

Stock, sales, and AI are still later. See [IMPLEMENTATION_PLAN.md](./IMPLEMENTATION_PLAN.md).

## i18n

English default; user can switch to Bangla. Copy lives in `lib/i18n/messages/`. Details: [DESIGN_SPEC.md](./DESIGN_SPEC.md).