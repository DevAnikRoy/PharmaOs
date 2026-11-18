# APP_FLOW — PharmaOS

## Foundation routes

| Path | Who | What happens |
|------|-----|----------------|
| `/` | Anyone | Redirect to `/dashboard` if logged in, else `/login` |
| `/signup` | Guest | Create auth user → create pharmacy → owner profile → `/dashboard` |
| `/login` | Guest | Email/password → `/dashboard` |
| `/logout` | Logged in | Sign out → `/login` |
| `/setup` | Signed-in owner without a profile | Confirm pharmacy name and retry pharmacy creation; sign out is available |
| `/dashboard/sales` | Owner | Search/add whole-pack lines, confirm cash payment, view recent sales |
| `/dashboard/sales/[id]` | Owner | View/print this shop's immutable receipt and batch allocations |
| `/dashboard/stock` | Owner | Search a medicine, receive whole-pack lots, view totals and expiry-ordered batch history |
| `/dashboard` | Owner | Show pharmacy name, language toggle, logout |
| `/dashboard/medicines` | Owner | Search brand or generic, open other brands, set this shop's price, add a medicine |

## Signup (detailed)

1. User enters pharmacy name, email, password (optional display name TO DECIDE).
2. App calls Supabase `signUp`.
3. If session is returned, app calls RPC `complete_owner_signup(pharmacy_name)`.
4. If email confirmation is required, send a link to `/auth/callback`. The callback exchanges the code and finishes pharmacy creation.
5. If creation fails or a signed-in user has no pharmacy, open `/setup` for a retry. Setup creation is idempotent.
6. Invalid confirmation links show a login error. The login form can request a fresh confirmation email.

## Medicines

1. Owner opens Medicines and types a brand (`Napa`) or generic (`paracetamol`), in English or Bangla.
2. Matching rows show this pharmacy's price, or "price not set".
3. Opening a row lists other brands of the same generic. The owner can type a price for any of them.
4. Add medicine saves the shared catalog row if it is new, then saves this pharmacy's price.

## Stock

1. Open Stock or follow Receive stock from a selected medicine.
2. Search/select the exact product and pack.
3. Enter batch number, expiry, quantity in whole packs, and buy price per pack.
4. Save through `receive_stock_batch`; the receipt reference prevents duplicate stock on retry.
5. Show physical/sellable/expired totals and receipts in expiry order.
6. Expired receipts can be recorded for reconciliation but are not sellable. A month/year expiry is entered as the month's final date.

## Cash sales

1. Open Sales, search a product, and add it to the cart. Search navigation preserves the cart.
2. Review whole-pack quantities and pack prices. Missing prices require manual entry; edits apply to this sale only.
3. Confirm full cash payment. The server recomputes totals and commits the sale and FEFO stock deductions together.
4. Insufficient non-expired stock rejects every line; adjust quantities or receive more stock before retrying.
5. A network/unknown result locks the cart for a retry with the same reference. Pending checkout data survives reloads in session storage scoped to this user/shop.
6. Open the matching receipt to clear recovery data. Print the receipt or start another sale.
7. Recent sales show the latest 20 receipts; the dashboard shows today's count and total in Asia/Dhaka.

Customer credit, supplier accounting, and AI are still later. See [IMPLEMENTATION_PLAN.md](./IMPLEMENTATION_PLAN.md).

## i18n

English default; user can switch to Bangla. Copy lives in `lib/i18n/messages/`. Details: [DESIGN_SPEC.md](./DESIGN_SPEC.md).