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

- `complete_owner_signup(pharmacy_name text, owner_full_name text default null)` — SECURITY DEFINER; creates pharmacy + owner row for `auth.uid()`.

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