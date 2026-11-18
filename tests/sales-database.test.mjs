import test from 'node:test';
import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { readFile, readdir } from 'node:fs/promises';
import { PGlite } from '@electric-sql/pglite';

const owner = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa';
const other = 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb';
const orphan = 'cccccccc-cccc-4ccc-8ccc-cccccccccccc';

test('cash sales allocate FEFO, roll back shortages, preserve receipts, and isolate tenants', async () => {
  const db = new PGlite();
  try {
    await db.exec(`
      create role anon nologin; create role authenticated nologin;
      create schema auth; create table auth.users(id uuid primary key);
      create function auth.uid() returns uuid language sql stable as
        $$ select nullif(current_setting('request.jwt.claim.sub', true), '')::uuid $$;
      grant usage on schema public, auth to authenticated, anon;
      grant execute on function auth.uid() to authenticated, anon;
      alter default privileges in schema public grant select, insert, update, delete on tables to authenticated;
      insert into auth.users values ('${owner}'), ('${other}'), ('${orphan}');
    `);
    const directory = new URL('../supabase/migrations/', import.meta.url);
    for (const file of (await readdir(directory)).filter((name) => name.endsWith('.sql')).sort()) {
      await db.exec(await readFile(new URL(file, directory), 'utf8'));
    }
    const asUser = async (id) => {
      await db.exec('reset role');
      await db.query("select set_config('request.jwt.claim.sub', $1, false)", [id]);
      await db.exec('set role authenticated');
    };
    await asUser(owner);
    await db.query('select complete_owner_signup($1)', ['Shop A']);
    const [a, b] = (await db.query('select id, brand_name_en from products order by id limit 2')).rows;
    const dates = (await db.query(`select
      (statement_timestamp() at time zone 'Asia/Dhaka')::date::text as today,
      ((statement_timestamp() at time zone 'Asia/Dhaka')::date - 1)::text as yesterday,
      ((statement_timestamp() at time zone 'Asia/Dhaka')::date + 1)::text as tomorrow`)).rows[0];
    const receive = async (product, qty, date, label) => (await db.query(
      'select receive_stock_batch($1, $2, $3, $4, $5, $6) as id',
      [product, randomUUID(), label, date, qty, '5.00'],
    )).rows[0].id;
    const early = await receive(a.id, 2, dates.today, 'EARLY');
    const later = await receive(a.id, 5, dates.tomorrow, 'LATER');
    const expired = await receive(a.id, 100, dates.yesterday, 'EXPIRED');
    await receive(b.id, 1, dates.tomorrow, 'B');
    const sell = async (lines, reference = randomUUID()) => (await db.query(
      'select complete_cash_sale($1, $2::jsonb) as id', [reference, JSON.stringify(lines)],
    )).rows[0].id;
    const cart = [{ product_id: a.id, quantity: 4, unit_price: '10.25' }];
    const reference = randomUUID();
    const receipt = await sell(cart, reference);
    assert.equal(await sell(cart, reference), receipt);
    await assert.rejects(sell([{ ...cart[0], quantity: 3 }], reference), /different details/);
    const allocations = (await db.query('select batch_id, quantity, purchase_price from sale_allocations')).rows;
    assert.deepEqual(new Map(allocations.map((row) => [row.batch_id, row.quantity])), new Map([[early, 2], [later, 2]]));
    assert.equal((await db.query('select quantity_remaining from stock_batches where id = $1', [expired])).rows[0].quantity_remaining, 100);
    assert.equal((await db.query('select total from sales')).rows[0].total, '41.00');
    assert.equal((await db.query('select line_total from sale_lines')).rows[0].line_total, '41.00');
    assert.equal((await db.query('select * from daily_cash_sales')).rows[0].total, '41.00');

    const before = (await db.query('select id, quantity_remaining from stock_batches order by id')).rows;
    // The first product could be deducted, then the second fails: everything must roll back.
    await assert.rejects(sell([
      { product_id: a.id, quantity: 1, unit_price: '2.00' },
      { product_id: b.id, quantity: 2, unit_price: '3.00' },
    ]), /Insufficient sellable stock/);
    assert.deepEqual((await db.query('select id, quantity_remaining from stock_batches order by id')).rows, before);
    assert.equal((await db.query('select id from sales')).rows.length, 1);
    assert.equal((await db.query('select id from sale_lines')).rows.length, 1);
    assert.equal((await db.query('select id from sale_allocations')).rows.length, 2);
    await assert.rejects(sell([{ product_id: a.id, quantity: 4, unit_price: '1' }]), /Insufficient sellable stock/);
    // A later checkout can use the remaining 3 packs; the next one cannot oversell them.
    const secondReceipt = await sell([{ product_id: a.id, quantity: 3, unit_price: '0.10' }]);
    await assert.rejects(sell([{ product_id: a.id, quantity: 1, unit_price: '1' }]), /Insufficient sellable stock/);
    assert.equal(await sell(cart, reference), receipt); // retry still works after depletion

    for (const bad of [[], {}, null, [{ product_id: a.id, quantity: 0, unit_price: '1' }],
      [{ product_id: a.id, quantity: 1.5, unit_price: '1' }],
      [{ product_id: a.id, quantity: 1, unit_price: 'NaN' }],
      [{ product_id: a.id, quantity: 1, unit_price: '0.001' }],
      [{ product_id: a.id, quantity: 2, unit_price: '9999999999.99' }]]) {
      await assert.rejects(sell(bad), /Invalid sale|Sale total too large/);
    }
    await assert.rejects(sell([cart[0], cart[0]]), /Duplicate medicine/);
    await assert.rejects(sell([{ product_id: randomUUID(), quantity: 1, unit_price: '1' }]), /Medicine not found/);
    await assert.rejects(db.query('update sales set total = 0'), /permission denied/);
    await assert.rejects(db.query('delete from sale_lines'), /permission denied/);
    await assert.rejects(db.query('update sale_allocations set quantity = 999'), /permission denied/);
    await assert.rejects(db.query('insert into sales(pharmacy_id) values (null)'), /permission denied/);

    // Receipt product descriptions and batch details survive later catalog edits.
    await db.exec('reset role');
    await db.query('update products set brand_name_en = $1 where id = $2', ['Changed', a.id]);
    await asUser(owner);
    assert.equal((await db.query('select brand_name_en from sale_lines where sale_id = $1', [receipt])).rows[0].brand_name_en, a.brand_name_en);
    assert.equal((await db.query('select sum(total) as total from sales')).rows[0].total, '41.30');
    // Equal-expiry/equal-receipt-time batches have a deterministic ID tie-break.
    const tieOne = await receive(b.id, 1, dates.today, 'TIE-ONE');
    const tieTwo = await receive(b.id, 1, dates.today, 'TIE-TWO');
    await db.exec('reset role');
    await db.query("update stock_batches set created_at = '2020-01-01T00:00:00Z' where id in ($1, $2)", [tieOne, tieTwo]);
    await asUser(owner);
    const tieReceipt = await sell([{ product_id: b.id, quantity: 1, unit_price: '0' }]);
    const tieAllocation = (await db.query(`select a.batch_id from sale_allocations a
      join sale_lines l on l.id = a.sale_line_id where l.sale_id = $1`, [tieReceipt])).rows[0];
    assert.equal(tieAllocation.batch_id, [tieOne, tieTwo].sort()[0]);

    // Daily books change date at midnight in Dhaka, not midnight UTC.
    await db.exec('reset role');
    await db.query("update sales set created_at = '2060-01-01T17:59:59Z' where id = $1", [receipt]);
    await db.query("update sales set created_at = '2060-01-01T18:00:00Z' where id = $1", [secondReceipt]);
    await asUser(owner);
    const daily = (await db.query("select sale_date::text, total from daily_cash_sales where sale_date >= '2060-01-01' order by sale_date")).rows;
    assert.deepEqual(daily, [{ sale_date: '2060-01-01', total: '41.00' }, { sale_date: '2060-01-02', total: '0.30' }]);
    await asUser(other);
    await db.query('select complete_owner_signup($1)', ['Shop B']);
    for (const table of ['sales', 'sale_lines', 'sale_allocations', 'daily_cash_sales']) {
      assert.equal((await db.query(`select * from ${table}`)).rows.length, 0, table);
    }
    await assert.rejects(sell(cart), /Insufficient sellable stock/);
    await receive(a.id, 4, dates.today, 'OTHER SHOP');
    const otherReceipt = await sell(cart, reference); // request reference is scoped to the shop
    assert.notEqual(otherReceipt, receipt);
    await asUser(orphan);
    await assert.rejects(sell(cart), /No pharmacy/);
    await db.exec("reset role; select set_config('request.jwt.claim.sub', '', false); set role anon");
    await assert.rejects(sell(cart), /permission denied/);
    for (const table of ['sales', 'sale_lines', 'sale_allocations', 'daily_cash_sales']) {
      await assert.rejects(db.query(`select * from ${table}`), /permission denied/);
    }
  } finally { await db.close(); }
});
