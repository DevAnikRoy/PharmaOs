# PharmaOS

Cloud pharmacy management for small pharmacies in Bangladesh. Foundation phase: auth, tenant (pharmacy), and docs only.

## 1. Vision

Help pharmacy owners run their shop with simple stock, sales, and reporting (future phases). MVP user: pharmacy owner (Bangla-first UX, English supported).

## 2. Stack (do not change without owner approval)

| Layer | Choice |
|-------|--------|
| Frontend | Next.js (App Router), TypeScript, Tailwind CSS |
| UI | shadcn/ui |
| Backend / DB / Auth | Supabase (Postgres + Auth + RLS) |
| Hosting | Vercel (TO DECIDE: production URL) |
| AI | TO DECIDE — not in foundation phase |

## 3. Data model (foundation)

- **pharmacies** — one row per shop (tenant).
- **users** — app profile linked to `auth.users`; belongs to one `pharmacy_id`; role e.g. `owner` | `staff` (staff UI later).

All tenant data is scoped by `pharmacy_id` via Row Level Security.

Future tables (medicines, stock, sales, etc.) are **out of scope** until Phase 2+.

## 4. Folder structure

```
/
├── app/
│   ├── (auth)/          # login, signup
│   ├── (dashboard)/     # protected app shell
│   ├── auth/            # OAuth/callback routes if needed
│   ├── layout.tsx
│   └── page.tsx
├── components/
│   └── ui/              # shadcn
├── lib/
│   ├── supabase/
│   └── i18n/
├── hooks/
├── types/
├── supabase/
│   └── migrations/
├── docs/
├── public/
├── middleware.ts
└── PROJECT.md
```

## 5. Documentation

| Doc | Purpose |
|-----|---------|
| [docs/PRD.md](docs/PRD.md) | Product requirements |
| [docs/TRD.md](docs/TRD.md) | Technical requirements |
| [docs/APP_FLOW.md](docs/APP_FLOW.md) | User flows |
| [docs/DESIGN_SPEC.md](docs/DESIGN_SPEC.md) | UI / UX |
| [docs/BACKEND_SCHEMA.md](docs/BACKEND_SCHEMA.md) | Schema & RLS |
| [docs/IMPLEMENTATION_PLAN.md](docs/IMPLEMENTATION_PLAN.md) | Phased build |

## 6. Status

| | |
|--|--|
| **Done** | Foundation: Next.js + shadcn, docs, Supabase (`pharmacies` / `users` + RLS), signup/login/logout, dashboard, EN/BN toggle |
| **Next task** | Medicine catalog & stock (Phase 2) — see [docs/IMPLEMENTATION_PLAN.md](docs/IMPLEMENTATION_PLAN.md) |
| **Known issues** | Supabase Auth: set Site URL + redirect URLs for local dev; disable email confirm for easiest signup testing (see chat instructions) |