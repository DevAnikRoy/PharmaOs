import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile, readdir } from 'node:fs/promises';
import { PGlite } from '@electric-sql/pglite';

const ownerA = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa';
const ownerB = 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb';
const orphan = 'cccccccc-cccc-4ccc-8ccc-cccccccccccc';

test('migrations enforce signup retries, receipt idempotency, tenant isolation, and expiry totals', async () => {
  const db = new PGlite();
  try {
    // Minimal Supabase roles and auth schema. Production uses Supabase's real auth.uid().
    await db.exec(`
      create role anon nologin;
      create role authenticated nologin;
      create schema auth;
      create table auth.users (id uuid primary key);
      create function auth.uid() returns uuid language sql stable as
        $$ select nullif(current_setting('request.jwt.claim.sub', true), '')::uuid $$;
      grant usage on schema public, auth to authenticated, anon;
      grant execute on function auth.uid() to authenticated, anon;
      alter default privileges in schema public grant select, insert, update, delete on tables to authenticated;
      insert into auth.users values ('${ownerA}'), ('${ownerB}'), ('${orphan}');
    `);
    const migrations = new URL('../supabase/migrations/', import.meta.url);
    for (const file of (await readdir(migrations)).filter((name) => name.endsWith('.sql')).sort()) {
      await db.exec(await readFile(new URL(file, migrations), 'utf8'));
    }
    const asUser = async (uid) => {
      await db.exec('reset role');
      await db.query("select set_config('request.jwt.claim.sub', $1, false)", [uid]);
      await db.exec('set role authenticated');
    };
    await asUser(ownerA);
    const signup = async (name) => (await db.query('select complete_owner_signup($1) as id', [name])).rows[0].id;
    const pharmacyA = await signup('Pharmacy A');
    assert.equal(await signup('Retry must not create another shop'), pharmacyA);
    await asUser(ownerB);
    const pharmacyB = await signup('Pharmacy B');
    assert.notEqual(pharmacyA, pharmacyB);
    assert.equal((await db.query('select id from pharmacies')).rows.length, 1);
    const product = (await db.query("select id from products where brand_name_en = 'Napa'")).rows[0].id;
    const date = (await db.query("select (now() at time zone 'Asia/Dhaka')::date::text as today, ((now() at time zone 'Asia/Dhaka')::date - 1)::text as yesterday, ((now() at time zone 'Asia/Dhaka')::date + 1)::text as tomorrow")).rows[0];
    const receipt = async (id, expiry, quantity = 3, price = '10.25') => (await db.query(
      'select receive_stock_batch($1, $2, $3, $4, $5, $6) as id',
      [product, id, 'LOT-1', expiry, quantity, price],
    )).rows[0].id;
    const r1 = '11111111-1111-4111-8111-111111111111';
    const r2 = '22222222-2222-4222-8222-222222222222';
    const r3 = '33333333-3333-4333-8333-333333333333';
    const first = await receipt(r1, date.today);
    assert.equal(await receipt(r1, date.today), first);
    await assert.rejects(receipt(r1, date.today, 4), /different details/);
    await receipt(r2, date.yesterday, 2);
    await receipt(r3, date.tomorrow, 5);
    const totals = (await db.query('select * from pharmacy_stock')).rows[0];
    assert.equal(Number(totals.total_packs), 10);
    assert.equal(Number(totals.sellable_packs), 8);
    assert.equal(Number(totals.expired_packs), 2);
    assert.equal(totals.next_expiry.toISOString().slice(0, 10), date.today);
    const fefo = await db.query(`select id from stock_batches where quantity_remaining > 0
      and expiry_date >= (now() at time zone 'Asia/Dhaka')::date
      order by expiry_date, created_at, id`);
    assert.equal(fefo.rows[0].id, first);
    await assert.rejects(receipt('44444444-4444-4444-8444-444444444444', date.today, 0), /positive whole/);
    await assert.rejects(receipt('44444444-4444-4444-8444-444444444444', date.today, 1, 'NaN'), /valid purchase price/);
    await assert.rejects(receipt('44444444-4444-4444-8444-444444444444', date.today, 1, '1.001'), /valid purchase price/);
    await assert.rejects(db.query('update stock_batches set quantity_remaining = 0'), /permission denied/);
    await assert.rejects(db.query('delete from stock_batches'), /permission denied/);
    await assert.rejects(db.query(`insert into stock_batches
      (pharmacy_id, product_id, request_id, batch_number, expiry_date, received_quantity, quantity_remaining, purchase_price, received_by)
      values ($1, $2, $3, 'forged', $4, 1, 1, 1, $5)`,
    [pharmacyB, product, '55555555-5555-4555-8555-555555555555', date.today, ownerB]), /permission denied/);

    await asUser(ownerA);
    assert.equal((await db.query('select * from stock_batches')).rows.length, 0);
    assert.equal((await db.query('select * from pharmacy_stock')).rows.length, 0);
    // Same request reference is independent per tenant.
    await receipt(r1, date.today, 7);
    assert.equal(Number((await db.query('select * from pharmacy_stock')).rows[0].total_packs), 7);
    await asUser(orphan);
    await assert.rejects(receipt(r2, date.today), /No pharmacy/);
    await db.exec("reset role; select set_config('request.jwt.claim.sub', '', false); set role anon");
    await assert.rejects(db.query('select * from stock_batches'), /permission denied/);
    await assert.rejects(db.query('select * from pharmacy_stock'), /permission denied/);
    await assert.rejects(db.query('select complete_owner_signup($1)', ['Unauthorized']), /permission denied/);
    await assert.rejects(receipt(r2, date.today), /permission denied/);
  } finally {
    await db.close();
  }
});
