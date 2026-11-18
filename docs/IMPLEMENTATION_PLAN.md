# IMPLEMENTATION_PLAN — PharmaOS

Retail pharmacies in Bangladesh. Phases 1–3 are implemented in source; apply the latest migration to enable batch stock in Supabase. Do not start AI features until the shop can already sell, stock, and look up a generic by hand.

Safety rule for every later AI feature: the app suggests, the pharmacist confirms, and the confirm or override is stored. The app never dispenses on its own.

## Why this order

| Your idea | When | Why not first |
|-----------|------|----------------|
| Brand-to-generic lookup | Phase 2 | This is the base. Almost everything else matches a medicine row. |
| Stock, expiry losses | Phases 3 and 5 | Needs batches with expiry dates. The “sell these first” list is a sort, not a model. |
| Billing, baki, supplier dues | Phase 4 | Needs stock so a sale can reduce a batch. |
| Interaction and dose checks | Phase 6 | A checked interaction table inside billing. A free-form chatbot is not the check. |
| Chronic-patient reminders | Phase 7 | Needs customers and past sales. Start with an on-screen due list. WhatsApp or SMS is a later switch. |
| Scan supplier invoice / voice entry | Phase 8 | The purchase form must work by typing first. Photo only fills a draft. |
| Prescription photo | Phase 9 | Suggest matching medicines. Pharmacist confirms every line before it can be billed. |
| Demand forecast | Phase 10 | Useless until the shop has about 2–3 months of real sales. |
| Batch / QR authenticity | Phase 11 | Do not build until a manufacturer or regulator feed exists. Never mark a batch “genuine” from a guess. |

## Phase 1 — Foundation

Done: Next.js, shadcn, Supabase auth, `pharmacies`, `users`, RLS, login, dashboard shell, EN/BN.

## Phase 2 — Catalog and substitution

Done:

- Shared medicine master: generic, brand, strength, form, pack.
- Bangla and English names.
- This pharmacy's selling price only.
- Search lists other brands of the same generic.
- Sample brands (Napa, Ace, Reset, Seclo, Losectil, Odopen) so search works on day one.

No stock math.

## Phase 3 — Batches and expiry

Implemented:

- Each receipt records batch number, expiry, whole pack quantity, and buy price per pack.
- Physical, sellable, and expired stock totals are calculated from remaining batch quantities.
- Stock screen searches the shared catalog and lists receipts by expiry, receipt time, and ID.
- Asia/Dhaka expiry boundary; stock is sellable through the expiry date.
- Tenant RLS and RPC-only writes; repeated receipt submissions do not duplicate stock.
- Signup recovery at `/setup`, idempotent pharmacy creation, confirmation email resend.
- Automated embedded Postgres checks and auth/validation regression tests (`npm test`).

FEFO order is prepared here. Atomic stock deduction is implemented with sales in Phase 4.
No loose-unit quantities, stock corrections, or write-offs are implemented yet.

## Phase 4 — Counter and books

- Sale: lines, qty, price, cash or baki (customer credit).
- Customer credit ledger.
- Supplier and purchase entry (typed).
- Supplier dues.
- Daily sales total on the dashboard.

## Phase 5 — Expiry alerts

- List: expired, expiring in 30/60/90 days, suggested “sell these first”.
- Optional discount flag the owner sets. The app does not auto-change prices.

## Phase 6 — Interaction and dose warnings

- Curated interaction pairs and simple dose ranges by generic, not an open chatbot.
- Billing shows a warning. Pharmacist can continue and must leave a reason.
- Store the warning and the decision.

## Phase 7 — Repeat customers

- Customer profile and usual medicines.
- “Due for refill” list from last purchase interval.
- TO DECIDE: WhatsApp or SMS provider and who pays per message.

## Phase 8 — Invoice draft from photo or voice

- Upload a supplier invoice photo or a short voice note.
- App fills a purchase draft.
- Owner edits and confirms before stock increases.

## Phase 9 — Prescription draft from photo

- Photo in, suggested medicine lines out.
- Each line is unconfirmed until the pharmacist accepts it.
- Accepted lines can be added to a sale. Rejected lines are kept for audit.
- TO DECIDE: which vision model, and whether photos stay in Supabase storage.

## Phase 10 — Demand forecast

- Per medicine: last months sold, season, days of stock left.
- Output is a reorder suggestion, not an automatic purchase order.
- Ship only after Phase 4 has been used long enough to trust the history.

## Phase 11 — Authenticity

- Blocked until there is a real batch or QR source.
- A failed lookup must say “unknown”, never “safe”.

## Explicitly out of this plan

- Multi-branch chains.
- Replacing the pharmacist’s judgment.
- Medical diagnosis.

## Next build

Phase 4, first slice: cash billing with whole-pack sale lines. Deduct non-expired
batches by earliest expiry, receipt time, then ID inside one database transaction.
Lock eligible rows, reject insufficient stock, record allocations, and make retries
idempotent. Show the receipt and daily sales total. Then add customer credit and
supplier/purchase accounting. Before loose-tablet sales, design base-unit conversion.
