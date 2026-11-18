# BACKEND_SCHEMA — PharmaOS (foundation)

## Tables

### `pharmacies`

| Column | Type | Notes |
|--------|------|-------|
| id | uuid PK | `gen_random_uuid()` |
| name | text | Shop name |
| created_at | timestamptz | |
| updated_at | timestamptz | |

### `users` (app profile)

| Column | Type | Notes |
|--------|------|-------|
| id | uuid PK | FK → `auth.users(id)` ON DELETE CASCADE |
| pharmacy_id | uuid FK | → `pharmacies.id` |
| role | user_role | `owner` \| `staff` (staff unused in Phase 1) |
| full_name | text | optional |
| created_at | timestamptz | |
| updated_at | timestamptz | |

## RPC

- `complete_owner_signup(pharmacy_name text, owner_full_name text default null)` — SECURITY DEFINER; creates pharmacy + owner row for `auth.uid()`; serialized per user and idempotent on retry.

## RLS summary

- Authenticated users **select** their pharmacy and colleagues in the same `pharmacy_id`.
- No direct insert on `pharmacies` / `users` from client except via RPC above.
- Future tables will use `pharmacy_id = current_pharmacy_id()`.

Source migration: `supabase/migrations/`.

## Catalog (Phase 2)

Shared across pharmacies. A shop does not own these rows.

### `generics`

| Column | Type | Notes |
|--------|------|-------|
| id | uuid PK | |
| name_en | text | Unique, case-insensitive |
| name_bn | text | Optional |
| created_at | timestamptz | |

### `products`

| Column | Type | Notes |
|--------|------|-------|
| id | uuid PK | |
| generic_id | uuid FK | → `generics.id` |
| brand_name_en / brand_name_bn | text | Bangla optional |
| strength | text | e.g. `500 mg` |
| form | medicine_form | tablet, capsule, syrup, and others |
| pack_unit | pack_unit | strip, box, bottle, and others |
| pack_quantity | integer | Count inside one pack |
| manufacturer | text | Optional |

One product is one brand + strength + form + pack. Stock quantity is not stored yet.

### `pharmacy_prices`

| Column | Type | Notes |
|--------|------|-------|
| pharmacy_id + product_id | PK | This shop's selling price only |
| selling_price | numeric(12,2) | BDT |

### `product_catalog`

Read-only view of `products` joined to `generics`. Used for search.

### Catalog RPC

- `add_pharmacy_medicine(...)` — find or create the generic and product, then set this pharmacy's price.
- `set_pharmacy_price(product_id, price)` — set this pharmacy's price on an existing product.

### Catalog RLS

- Any signed-in user can read generics and products.
- A user can read only their own pharmacy's prices.
- Writes go through the two RPCs above, which check `auth.uid()`.

## Auth

Supabase manages `auth.users`; app never stores passwords.

## Stock (Phase 3)

### `stock_batches`

One purchase receipt/lot per row: `id`, `pharmacy_id`, `product_id`, `request_id`,
`batch_number`, `expiry_date`, `received_quantity`, `quantity_remaining`,
`purchase_price`, `received_by`, and `created_at`.

- Quantities are positive whole catalog packs on receipt. Remaining quantity is
  between zero and the received quantity. All prices are BDT per pack.
- `(pharmacy_id, request_id)` is unique. Reusing a receipt reference with identical
  details returns the original ID; changed details are rejected.
- Different receipts may have the same product, batch number, and expiry.
- Authenticated users can select only their own pharmacy's lots. Direct insert,
  update, and delete are revoked. No client-side stock deduction is allowed.

### `receive_stock_batch(...)`

SECURITY DEFINER RPC derives the tenant from `auth.uid()`, validates the input,
locks the tenant/receipt reference, and inserts a lot atomically. It does not
change selling prices. Unauthenticated users and users without a pharmacy are rejected.

### `pharmacy_stock`

Security-invoker view grouped by tenant/product: `total_packs`, `sellable_packs`,
`expired_packs`, and `next_expiry`. Expiry compares to the Asia/Dhaka date, with
stock sellable through its expiry date. Physical stock includes expired packs.
FEFO uses non-expired positive-quantity lots sorted by expiry, creation time, ID.
Cash sales now deduct batches atomically through `complete_cash_sale`.

Migration: `20261118090000_batches_and_signup_recovery.sql`.


## Cash sales (Phase 4, first slice)

Migration: `20261118100000_cash_sales.sql`.

- `sales`: tenant, unique tenant/request reference, canonical request lines, cash
  payment method, server-computed total, cashier, and timestamp.
- `sale_lines`: product reference, whole-pack quantity, unit price, generated line
  total, and immutable product description/strength/form/pack snapshots.
- `sale_allocations`: sale-line/batch references, pack quantity, batch number,
  expiry, and purchase-cost snapshots. Composite foreign keys enforce tenant identity.
- All three tables enable tenant RLS and allow authenticated SELECT only.
- `daily_cash_sales`: security-invoker view with date, count, and total grouped by
  tenant and Asia/Dhaka sale date. Aggregation happens in SQL, independent of API row limits.

### `complete_cash_sale(p_request_id uuid, p_lines jsonb)`

Input lines contain `product_id`, positive integer `quantity`, and decimal
`unit_price` (BDT per whole pack). Between 1 and 100 distinct products are allowed.
Prices have at most two decimal places; a sale total is limited to 9,999,999,999.99.
Per-sale prices may differ from the master pharmacy price. The server never accepts
client totals, tenant IDs, batch selections, or claimed stock availability.

The RPC derives tenant/cashier identity, canonicalizes lines, and locks its request
reference. Identical retries return the existing sale even after depletion; changed
payloads are rejected. It processes products in UUID order and locks sellable batches
in expiry/receipt-time/ID order, waiting for competing locks. Each allocation and
stock deduction is stored with the receipt. A shortage on any line raises an exception,
rolling back the entire sale. The operation is cash-only and cannot edit or void sales.
