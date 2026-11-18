import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import ts from 'typescript';

const source = await readFile(new URL('../lib/stock-validation.ts', import.meta.url), 'utf8');
const { outputText } = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.ESNext } });
const { validateBatch, dhakaDate } = await import(`data:text/javascript;base64,${Buffer.from(outputText).toString('base64')}`);
const valid = {
  productId: '11111111-1111-4111-8111-111111111111',
  requestId: '22222222-2222-4222-8222-222222222222',
  batchNumber: 'LOT-A', expiryDate: '2028-02-29', quantity: '12', purchasePrice: '20.25',
};

test('accepts whole packs, free stock, and expired receipts for reconciliation', () => {
  assert.equal(validateBatch(valid), true);
  assert.equal(validateBatch({ ...valid, purchasePrice: '0', expiryDate: '2020-01-01' }), true);
});
test('rejects malformed references, impossible dates, and empty batch numbers', () => {
  for (const patch of [{ productId: 'bad' }, { requestId: '' }, { expiryDate: '2027-02-29' },
    { expiryDate: '2028-04-31' }, { expiryDate: '0000-01-01' }, { batchNumber: '  ' }, { batchNumber: 'A'.repeat(101) }]) {
    assert.equal(validateBatch({ ...valid, ...patch }), false, JSON.stringify(patch));
  }
});
test('rejects fractional, zero, negative and overflowing stock quantities', () => {
  for (const quantity of ['', '0', '-1', '1.5', 'Infinity', '2147483648', '1e3']) {
    assert.equal(validateBatch({ ...valid, quantity }), false, quantity);
  }
});
test('rejects blank, negative, excessive precision and overflowing purchase prices', () => {
  for (const purchasePrice of ['', '-1', '1.001', 'NaN', 'Infinity', '10000000000.00', '1e3']) {
    assert.equal(validateBatch({ ...valid, purchasePrice }), false, purchasePrice);
  }
});
test('expiry day switches at midnight in Bangladesh, independent of host timezone', () => {
  assert.equal(dhakaDate(new Date('2026-11-18T17:59:59Z')), '2026-11-18');
  assert.equal(dhakaDate(new Date('2026-11-18T18:00:00Z')), '2026-11-19');
});
