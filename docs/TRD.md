# TRD — PharmaOS

## Stack

Defined in [PROJECT.md](../PROJECT.md#2-stack-do-not-change-without-owner-approval): Next.js App Router, TypeScript, Tailwind, shadcn/ui, Supabase, Vercel (production TO DECIDE).

## Auth

- Supabase Auth (email + password for foundation).
- Session cookies managed by `@supabase/ssr` for server and browser clients.
- Next.js Proxy (`proxy.ts`) refreshes sessions and protects `/dashboard` and `/setup`. Refreshed cookies are preserved on redirects.

## Environments

| Env | Config |
|-----|--------|
| Local | `.env.local` (not committed) |
| CI / Preview | Vercel env vars TO DECIDE |

## Required env vars

See `.env.example` in repo root.

## Security

- Row Level Security on all tenant tables.
- No service role key in the browser.
- Anon/publishable key only in `NEXT_PUBLIC_*` vars.

Schema details: [BACKEND_SCHEMA.md](./BACKEND_SCHEMA.md).

## Verification

- `npm run lint`, `npm run typecheck`, `npm test`, and `npm run build`.
- Tests use PGlite (embedded Postgres) with a minimal Supabase auth/role fixture.
  They apply every migration and check RLS, RPC permissions, receipt retries,
  expiry totals, cash-sale allocation/rollback, receipt snapshots, daily timezone boundaries, signup recovery, and validation. They do not replace a live
  Supabase/Auth browser smoke test.
- Current sandbox prevents Turbopack from binding a CSS worker port; production
  build must be verified in an environment that permits local process networking.


## Cash checkout consistency

Cash checkout runs through a SECURITY DEFINER RPC with authenticated tenant
resolution, request advisory locking, globally ordered product processing, and
FEFO row locks. Sale/line/allocation inserts and batch updates share one transaction.
The client uses integer decimal cents for preview; Postgres recomputes final totals.
Browser session storage retains uncertain checkout details until the corresponding
receipt is opened. This recovery is scoped to both pharmacy and user.
Embedded tests validate transactions and sequential oversell rejection; independent
Postgres connections must be used to verify real lock contention in deployment QA.
