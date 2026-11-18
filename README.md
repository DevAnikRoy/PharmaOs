# PharmaOS

Cloud pharmacy management for small pharmacies in Bangladesh. Built with Next.js
16, React 19, TypeScript, Tailwind/shadcn, and Supabase Auth/Postgres.

Implemented: owner accounts and pharmacy setup/recovery, EN/BN interface, shared
medicine catalog, per-pharmacy selling prices, purchase lots, expiry, and stock totals.

## Run locally

1. Install dependencies: `npm ci`.
2. Copy `.env.example` to `.env.local` and fill in the Supabase URL and public key.
3. Apply `supabase/migrations/*.sql` to your Supabase project in filename order.
   For an existing Phase 2 database, apply only the new migration:
   `20261118090000_batches_and_signup_recovery.sql`.
4. In Supabase Auth, set the Site URL to your app origin and allow
   `http://localhost:3000/auth/callback` (plus your deployed callback URL).
   Email confirmation can stay enabled. Optionally set `NEXT_PUBLIC_SITE_URL`.
5. Run `npm run dev` and open `http://localhost:3000`.

The new migration has been tested in embedded Postgres. It has not been applied
to the hosted Supabase project by this change.

## Main workflows

- Sign up, confirm email when required, and finish pharmacy setup. Interrupted
  setup can be retried at `/setup` without creating a second shop.
- Search Medicines by brand/generic, compare other brands, and set a selling price.
- Open Stock, select a product, and record its batch number, expiry, whole pack
  quantity, and buy price. View total, sellable, and expired quantities.

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
idempotent setup/receipts, expiry boundaries, input validation, and auth redirects.
They do not call the hosted Supabase project or send email.

The current agent sandbox blocks Turbopack's CSS worker from binding a local port,
so the production build still needs verification outside that restriction.
`next/font/google` also requires Google Fonts network access during the build.

## Next step

Phase 4 starts with cash billing: record whole-pack sale lines and atomically
allocate/deduct non-expired batches by earliest expiry, then receipt time and ID.
Use row locks and idempotent sale references to prevent overselling or duplicate
sales. Add receipts and daily dashboard totals, then customer credit and supplier
accounting.

See [PROJECT.md](./PROJECT.md), [schema](./docs/BACKEND_SCHEMA.md), and
[implementation plan](./docs/IMPLEMENTATION_PLAN.md) for architecture and scope.
