# PharmaOS

Cloud pharmacy management for small pharmacies in Bangladesh. Foundation, shared medicine catalog, batch stock tracking, and cash billing.

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

Medicine catalog and per-pharmacy prices are in [docs/BACKEND_SCHEMA.md](docs/BACKEND_SCHEMA.md). Batch stock and cash sales are implemented. Customer credit and supplier accounting are next.

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
├── proxy.ts
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
| **Done** | Foundation, catalog, signup recovery, batch stock, and Phase 4 cash billing: atomic FEFO allocation, receipts, recent sales, and daily totals, EN/BN |
| **Next task** | Phase 4 customer credit (baki) and repayments, then suppliers and purchase accounting — see [docs/IMPLEMENTATION_PLAN.md](docs/IMPLEMENTATION_PLAN.md) |
| **Known issues** | Apply the Phase 3 and cash-sales migrations before using Stock, Sales, or dashboard totals. Configure Auth Site URL and allow `/auth/callback` redirects. Build verification in this sandbox is blocked by Turbopack port restrictions. See README. |

## 7. Stock units

Quantities are whole catalog packs. One strip containing 10 tablets is one pack;
one bottle is one pack. Purchase and selling prices are BDT per pack. Existing
selling prices are not converted. Loose-unit sales need a separate conversion design.
Expiry uses the Asia/Dhaka calendar: a lot remains sellable through its printed
expiry date. Expired stock remains in physical totals but is excluded from sellable totals.

## 8. Next implementation

Add customer profiles and baki sales using the existing atomic sale/allocation
transaction. Record the paid amount and outstanding amount with immutable ledger
entries. Add idempotent repayment entry and show each customer's balance/history.
Cash dashboard totals must continue to distinguish cash collected from credit
sales. Supplier profiles, purchase invoices, supplier payments, and dues follow.

## 9. Cash sale behavior

The counter supports 1–100 distinct medicine lines, whole packs, and per-sale price
edits. Totals are calculated from decimal cents and recomputed in Postgres. Each
checkout atomically stores the receipt, product/price snapshots and batch
allocations, then reduces sellable batches in expiry/time/ID order. Insufficient
stock rolls the whole checkout back. Duplicate references return the original
receipt. Daily totals use the Asia/Dhaka date.

An uncertain checkout is retained in this browser tab's session storage, scoped
to pharmacy and user. A retry uses the same reference and details. Recovery is
cleared when its matching receipt is opened. Drafts before checkout are kept
while searching, but are not saved across a page reload.
