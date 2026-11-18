# PharmaOS

Cloud pharmacy management for small pharmacies in Bangladesh. Built with Next.js
16, React 19, TypeScript, Tailwind/shadcn, and Supabase Auth/Postgres.

Implemented: owner accounts and pharmacy setup/recovery, EN/BN interface, shared
medicine catalog, per-pharmacy selling prices, purchase lots, expiry, stock totals, cash billing, receipts, and daily sales totals.

## Run locally

1. Install dependencies: `npm ci`.
2. Copy `.env.example` to `.env.local` and fill in the Supabase URL and public key.
3. Apply `supabase/migrations/*.sql` to your Supabase project in filename order.
   For an existing Phase 2 database, apply these pending migrations in order:
   - `20261118090000_batches_and_signup_recovery.sql`
   - `20261118100000_cash_sales.sql`
   If the batch migration is already applied, apply only the cash-sales migration.
4. In Supabase Auth, set the Site URL to your app origin and allow
   `http://localhost:3000/auth/callback` (plus your deployed callback URL).
   Email confirmation can stay enabled. Optionally set `NEXT_PUBLIC_SITE_URL`.
5. Run `npm run dev` and open `http://localhost:3000`.

The new migrations have been tested in embedded Postgres. They have not been applied
to the hosted Supabase project by this change.

## Main workflows

- Sign up, confirm email when required, and finish pharmacy setup. Interrupted
  setup can be retried at `/setup` without creating a second shop.
- Search Medicines by brand/generic, compare other brands, and set a selling price.
- Open Stock, select a product, and record its batch number, expiry, whole pack
  quantity, and buy price. View total, sellable, and expired quantities.
- Open Sales, search/add medicines, review whole-pack quantities and prices, and
  confirm full cash payment. The sale deducts sellable batches by earliest expiry.
  A shortage rejects the entire sale. Open or print its receipt, including batch allocations.
- The dashboard shows today's sale count and cash sales total in Bangladesh time.
- If checkout loses its response, retry the saved checkout from the same browser
  tab. Recovery retains its reference across reloads and is cleared on the matching
  receipt page. Per-sale price edits do not change the saved catalog price.

Quantities count **whole catalog packs**. One strip of 10 tablets is one pack;
a bottle is one pack. Buy and selling prices are per pack. Existing selling price
values are preserved. Loose-tablet sales are not implemented. Stock is sellable
through the expiry date in Bangladesh time. Printed month/year expiries should
be entered as the last day of that month.

## Verify

```sh
npm run lint
npm run typecheck
npm test
npm run build
```

Tests apply all SQL migrations in an isolated PGlite Postgres database with minimal
Supabase auth/role fixtures. They check tenant isolation, RPC permissions,
idempotent setup/receipts/checkouts, FEFO allocation, shortage rollback, receipt
snapshots, daily timezone boundaries, input validation, and auth redirects.
PGlite uses one backend; live multi-connection contention and browser checkout
recovery still need smoke testing against Supabase before production rollout.
They do not call the hosted Supabase project or send email.

The current agent sandbox blocks Turbopack's CSS worker from binding a local port,
so the production build still needs verification outside that restriction.
`next/font/google` also requires Google Fonts network access during the build.

## Next step

Phase 4 customer credit (baki): customer profiles, unpaid/part-paid sales, an
immutable credit ledger, and idempotent repayment entry. Then add supplier
profiles, purchase invoices, payments, and dues.

See [PROJECT.md](./PROJECT.md), [schema](./docs/BACKEND_SCHEMA.md), and
[implementation plan](./docs/IMPLEMENTATION_PLAN.md) for architecture and scope.
