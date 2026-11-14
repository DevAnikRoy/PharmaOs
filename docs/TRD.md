# TRD — PharmaOS

## Stack

Defined in [PROJECT.md](../PROJECT.md#2-stack-do-not-change-without-owner-approval): Next.js App Router, TypeScript, Tailwind, shadcn/ui, Supabase, Vercel (production TO DECIDE).

## Auth

- Supabase Auth (email + password for foundation).
- Session in HTTP-only cookies via `@supabase/ssr`.
- Middleware refreshes session and protects `/dashboard`.

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