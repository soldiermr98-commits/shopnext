// Executed transport/store unit tests with explicit fetch doubles, NOT SQL concurrency evidence.
import test from 'node:test';
import assert from 'node:assert/strict';
import { buildSync } from 'esbuild';
import { createRequire } from 'node:module';
import { resolve } from 'node:path';
import { readFileSync } from 'node:fs';
const root = resolve(import.meta.dirname, '..');
const code = buildSync({ stdin: { contents: "export {useCartStore} from './src/store/cartStore'; export {useAuthStore} from './src/store/authStore'; export {financialApi,FinancialError} from './src/lib/financialApi'; export {formatToman} from './src/lib/persian'; export {financialDate} from './src/lib/financialDate'; export {orderAdapter} from './src/lib/orderAdapter';", resolveDir: root, loader: 'ts' }, bundle: true, platform: 'node', format: 'cjs', write: false }).outputFiles[0].text;
function setup() {
  const removed = [];
  globalThis.document = { cookie: 'XSRF-TOKEN=unit-csrf' };
  globalThis.localStorage = { removeItem: key => removed.push(key), getItem: () => { throw Error('Untrusted demo data must not be read'); } };
  const module = { exports: {} };
  new Function('require', 'module', 'exports', code)(createRequire(import.meta.url), module, module.exports);
  return { ...module.exports, removed };
}
const json = (body, status = 200) => new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } });
function cart(product = 1, total = 3) {
  const line = { product_id: product, variant_id: null, quantity: 2, key: `${product}:0`, title: 'واقعی', sku: 'sku', unit_price: 7, listed_subtotal: 20, sale_discount: 6, automatic_discount: 11, coupon_discount: 0, tax_added: 0, tax_amount: 0, rounding_adjustment: 0, line_total: total };
  return { version: 1, items: [{ product_id: product, variant_id: null, quantity: 2 }], pricing: { unit: 'TOMAN', lines: [line], totals: { subtotal: 20, items_discount: 17, coupon_discount: 0, vat_amount: 0, included_vat: 0, rounding_adjustment: 0, merchandise_total: total, shipping_fee: null, payable_total: null }, checkout_ready: false }, errors: {}, merge_conflict: true, pending_guest_items: [{ product_id: 9, variant_id: null, quantity: 1 }] };
}
test('C02 H02 H06 H10 real cart stores server zero/line totals, preserves explicit conflict and sends IDs/quantity/version only', async () => {
  const { useCartStore: store, formatToman, removed } = setup();
  assert.deepEqual(store.getState().items, []); assert.equal(store.getState().getGrandTotal(), null);
  assert.deepEqual(removed, ['digistyle_cart']);
  const calls = [];
  globalThis.fetch = async (url, init) => { calls.push({ url, init }); if (init.method === 'PUT') return json(cart()); return json({ ...cart(), version: 0, items: [], pricing: { ...cart().pricing, lines: [] } }); };
  await store.getState().addItem({ id: '1', title: 'spoof', price: 999999999, salePrice: 888888888, stock: 1 }, 2);
  const put = calls.find(c => c.init.method === 'PUT');
  assert.deepEqual(JSON.parse(put.init.body), { items: [{ product_id: 1, variant_id: null, quantity: 2 }], version: 0 });
  assert.equal(put.init.credentials, 'same-origin');
  assert.equal(store.getState().items[0].serverLine.line_total, 3); // NOT unit_price * quantity
  assert.equal(store.getState().mergeConflict, true);
  assert.equal(store.getState().getGrandTotal(), null); // Unselected shipping is NOT free.
  assert.match(formatToman(0), /۰/); assert.match(formatToman(null), /انتظار/); assert.match(formatToman(0.5), /نامعتبر/);
});
test('C03 C04 H07 H10 checkout retries send the identical explicit idempotency key, never client monetary fields', async () => {
  const { financialApi } = setup(); const bodies = [];
  globalThis.fetch = async (_url, init) => { bodies.push(JSON.parse(init.body)); return json({ order: { id: 4, payment_state: 'unpaid' } }, 201); };
  const input = { version: 1, address_id: 2, shipping_method: 'post', payment_method: 'cod', coupon: null, idempotency_key: 'explicit_retry_key_0001' };
  const a = await financialApi.checkout(input); const b = await financialApi.checkout(input);
  assert.deepEqual(bodies, [input, input]); assert.equal(a.order.payment_state, 'unpaid'); assert.equal(b.order.id, 4);
});
test('H02 M03 stale in-flight cart response cannot cross authenticated identities', async () => {
  const { useCartStore: store, useAuthStore: auth } = setup(); let resolveOld;
  globalThis.fetch = () => new Promise(resolve => { resolveOld = resolve; });
  const stale = store.getState().refresh();
  globalThis.fetch = async () => json(cart(2));
  auth.setState({ user: { id: 'new-owner' }, isLoading: false });
  await new Promise(resolve => setImmediate(resolve));
  resolveOld(json(cart(1, 999)));
  await stale;
  assert.equal(store.getState().items[0].productId, '2');
  assert.equal(store.getState().items[0].serverLine.line_total, 3);
});
test('financial failures remain failures, never fallback orders or raw server SQL', async () => {
  const { financialApi, FinancialError } = setup();
  globalThis.fetch = async () => json({ message: 'SQL secret diagnostic' }, 503);
  await assert.rejects(financialApi.order('123'), e => e instanceof FinancialError && e.status === 503 && !e.message.includes('SQL'));
  globalThis.fetch = async () => json({ errors: { stock: ['موجودی کافی نیست.'] } }, 422);
  await assert.rejects(financialApi.checkout({}), /موجودی کافی نیست/);
});

test('M07 financial timestamps use explicit Tehran midnight, historical DST and Persian leap date; invalid/date-only fail closed', () => {
  const { financialDate: date } = setup();
  assert.match(date('2026-10-20 20:29:00'), /۲۳:۵۹/);
  assert.match(date('2026-10-20 20:30:00'), /۰۰:۰۰/);
  assert.match(date('2020-07-01T19:29:00Z'), /۲۳:۵۹/); // Historical UTC+4:30 summer.
  assert.match(date('2020-07-01T19:30:00Z'), /۰۰:۰۰/);
  assert.match(date('2020-01-01T20:30:00Z'), /۰۰:۰۰/); // Historical UTC+3:30 winter.
  assert.match(date('2025-03-20T08:00:00Z'), /۳۰ اسفند ۱۴۰۳/);
  assert.match(date('2025-03-21T08:00:00Z'), /۱ فروردین ۱۴۰۴/);
  for (const value of ['not-a-date', '2025-03-20', '2025-02-30T00:00:00Z', '2025-03-20T24:00:00Z', '2025-03-20T08:00:00']) assert.equal(date(value), 'تاریخ نامعتبر');
});

test('H10 M11 immutable invoice adapter preserves zero paid/discount values and server totals, never fabricated legal identity', () => {
  const { orderAdapter } = setup();
  const quote = cart().pricing;
  const order = orderAdapter({ id: 1, order_number: 'real', tracking_code: 'private', status: 'pending', payment_method: 'cod', payment_state: 'unpaid', total_paid: 0, payable_total: 3, rounding_adjustment: -1, invoice: quote, items: quote.lines, shipping_address: { id: 2, recipient_name: 'مالک', recipient_phone: '09000000000' }, created_at: '2026-10-21 00:00:00' });
  assert.equal(order.isPaid, false); assert.equal(order.totalPaid, 0); assert.equal(order.payableTotal, 3);
  assert.equal(order.items[0].unitPrice, 7); assert.equal(order.items[0].lineTotal, 3);
  assert.equal(order.roundingAdjustment, -1); assert.equal(order.couponDiscount, 0);
  for (const page of ['AccountPage', 'OrderSuccessPage']) assert.doesNotMatch(readFileSync(resolve(root, 'src/pages/storefront', page + '.tsx'), 'utf8'), /(?:شناسه ملی|کد اقتصادی):\s*[۰-۹]{5}/);
  const account = readFileSync(resolve(root, 'src/pages/storefront/AccountPage.tsx'), 'utf8');
  assert.match(account, /disabled title="شارژ آنلاین در این مرحله فعال نیست"/);
});
