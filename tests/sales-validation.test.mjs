import test from 'node:test';
import assert from 'node:assert/strict';
import { loadTs } from './helpers/load-ts.mjs';

const stock = await loadTs(new URL('../lib/stock-validation.ts', import.meta.url));
const validation = await loadTs(new URL('../lib/sales-validation.ts', import.meta.url), { '@/lib/stock-validation': stock });
const { validateCashSale, priceCents } = validation;
const id = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa';
const second = 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb';
const line = { product_id: id, quantity: 3, unit_price: '0.10' };

test('cash totals use exact decimal cents and normalize inputs', () => {
  const sale = validateCashSale([line, { product_id: second, quantity: 1, unit_price: '0.2' }]);
  assert.equal(sale.totalCents, 50);
  assert.equal(sale.lines[1].unit_price, '0.20');
  assert.equal(priceCents('9999999999.99'), 999999999999n);
  assert.equal(validateCashSale([{ ...line, quantity: 1, unit_price: '0' }]).totalCents, 0);
});

test('rejects empty carts, duplicate medicines, invalid quantities and invalid prices', () => {
  for (const value of [null, {}, [], [null], [line, { ...line, product_id: id.toUpperCase() }],
    [{ ...line, quantity: 0 }], [{ ...line, quantity: 1.5 }], [{ ...line, quantity: '2' }],
    [{ ...line, quantity: 2147483648 }], [{ ...line, unit_price: '' }],
    [{ ...line, unit_price: 'NaN' }], [{ ...line, unit_price: '-1' }],
    [{ ...line, unit_price: '0.001' }], [{ ...line, unit_price: '1e2' }],
    [{ ...line, unit_price: 2 }], [{ ...line, product_id: 'bad' }]]) {
    assert.equal(validateCashSale(value), null, JSON.stringify(value));
  }
});

test('bounds cart size and total without overflowing JavaScript numbers', () => {
  assert.equal(validateCashSale(Array(101).fill(line)), null);
  assert.equal(validateCashSale([{ ...line, unit_price: '9999999999.99', quantity: 2 }]), null);
  assert.equal(validateCashSale([{ ...line, unit_price: '9999999999.99', quantity: 2147483647 }]), null);
});

test('checkout authenticates, maps stock failures, and returns the receipt only after invalidation', async () => {
  const invalidations = [];
  let user = { id: 'owner' };
  let result = { data: 'sale-id', error: null };
  let calls = 0;
  const { completeCashSale } = await loadTs(new URL('../app/actions/sales.ts', import.meta.url), {
    '@/lib/sales-validation': validation, '@/lib/stock-validation': stock,
    'next/cache': { revalidatePath: (path) => invalidations.push(path) },
    '@/lib/supabase/server': { createClient: async () => ({
      auth: { getUser: async () => ({ data: { user } }) },
      rpc: async (name, args) => {
        calls++;
        assert.equal(name, 'complete_cash_sale');
        assert.equal(args.p_lines[0].unit_price, '0.10');
        return result;
      },
    }) },
  });
  assert.equal((await completeCashSale('bad', [line])).error, 'invalidSale');
  assert.equal(calls, 0);
  user = null;
  assert.equal((await completeCashSale(id, [line])).error, 'sessionExpired');
  assert.equal(calls, 0);
  user = { id: 'owner' };
  result = { data: null, error: { message: 'Insufficient sellable stock' } };
  assert.equal((await completeCashSale(id, [line])).error, 'insufficientStock');
  assert.equal(invalidations.length, 0);
  result = { data: null, error: { message: 'Connection lost' } };
  assert.equal((await completeCashSale(id, [line])).error, 'saleSaveError');
  result = { data: 'sale-id', error: null };
  assert.equal((await completeCashSale(id, [line])).saleId, 'sale-id');
  assert.deepEqual(invalidations, ['/dashboard', '/dashboard/stock', '/dashboard/sales']);
});
