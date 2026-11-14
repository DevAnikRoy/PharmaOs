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

## Auth

Supabase manages `auth.users`; app never stores passwords.