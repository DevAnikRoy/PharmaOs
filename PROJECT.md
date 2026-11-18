# PharmaOS

Cloud pharmacy management for small pharmacies in Bangladesh. Foundation, shared medicine catalog, and batch stock tracking.

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

Medicine catalog and per-pharmacy prices are in [docs/BACKEND_SCHEMA.md](docs/BACKEND_SCHEMA.md). Batch stock tracking is implemented; billing and sales are next.

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
| **Done** | Foundation, Phase 2 catalog, signup recovery, and Phase 3 batches: purchase lots, expiry, per-shop stock totals, EN/BN |
| **Next task** | Counter and books (Phase 4): atomic FEFO sales, then customer credit, suppliers, and purchases — see [docs/IMPLEMENTATION_PLAN.md](docs/IMPLEMENTATION_PLAN.md) |
| **Known issues** | Apply the Phase 3 migration before using Stock. Configure Auth Site URL and allow `/auth/callback` redirects. Build verification in this sandbox is blocked by Turbopack port restrictions. See README. |

## 7. Stock units

Quantities are whole catalog packs. One strip containing 10 tablets is one pack;
one bottle is one pack. Purchase and selling prices are BDT per pack. Existing
selling prices are not converted. Loose-unit sales need a separate conversion design.
Expiry uses the Asia/Dhaka calendar: a lot remains sellable through its printed
expiry date. Expired stock remains in physical totals but is excluded from sellable totals.

## 8. Next implementation

Start Phase 4 with a cash sale: choose medicines, enter whole pack quantities,
confirm the total, and atomically deduct sellable batches in FEFO order. Use row
locks and an idempotency reference to prevent overselling or duplicate sales.
Store sale lines and their batch allocations, then add daily dashboard totals.
Customer credit, suppliers, and supplier dues follow that transaction foundation.
