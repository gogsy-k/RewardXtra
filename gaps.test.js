/*
 * Gap-fill tests — untested branches across already-tested modules.
 * Chalao:  node gaps.test.js
 */
const assert = require('assert');
const R = require('./reminders');
const Cap = require('./captracker');
const Rec = require('./recommend');
const O = require('./offers');
const P = require('./premium');
const Ref = require('./cardreferral');

let passed = 0;
function test(name, fn) {
  try { fn(); passed++; console.log(`  ✓ ${name}`); }
  catch (e) { console.error(`  ✗ ${name}\n      ${e.message}`); process.exitCode = 1; }
}

console.log('CardWiz — Gap-fill Tests\n');

// ---- reminders.reminderMessage (all 3 branches) ----
test('reminderMessage: due today (days<=0)', () => {
  assert.ok(R.reminderMessage('HDFC', 0).startsWith('Aaj HDFC'));
  assert.ok(R.reminderMessage('HDFC', -3).startsWith('Aaj HDFC'));
});
test('reminderMessage: due tomorrow (days===1)', () => {
  assert.strictEqual(R.reminderMessage('Axis', 1), 'Axis ka bill kal due hai');
});
test('reminderMessage: N days', () => {
  assert.strictEqual(R.reminderMessage('SBI', 5), 'SBI ka bill 5 din mein due hai');
});
test('reminders: leap-year Feb has 29 days', () => {
  assert.strictEqual(R.lastDayOfMonth(2024, 1), 29); // month index 1 = Feb, 2024 leap
  assert.strictEqual(R.lastDayOfMonth(2026, 1), 28); // 2026 non-leap
});

// ---- captracker resetAll / cumulative tracked spend ----
test('captracker.resetAll -> empty used with current period', () => {
  const r = Cap.resetAll(new Date('2026-03-15'));
  assert.deepStrictEqual(r.used, {});
  assert.strictEqual(r.period, '2026-03');
});
test('captracker.totalTrackedSpend', () => {
  assert.strictEqual(Cap.totalTrackedSpend({ 'hdfc-x': 12000 }, 'hdfc-x'), 12000);
  assert.strictEqual(Cap.totalTrackedSpend({}, 'missing'), 0);
  assert.strictEqual(Cap.totalTrackedSpend(null, 'x'), 0);
});
test('captracker.addTrackedSpend is immutable + coerces numbers', () => {
  const before = { a: 100 };
  const after = Cap.addTrackedSpend(before, 'a', 50);
  assert.strictEqual(after.a, 150);
  assert.strictEqual(before.a, 100, 'original must be unchanged');
  assert.strictEqual(Cap.addTrackedSpend(null, 'a', '25').a, 25);
  assert.strictEqual(Cap.addTrackedSpend({}, 'a', 'abc').a, 0); // NaN -> 0
});

// ---- recommend.topLine (all branches) ----
test('topLine: empty pool', () => {
  assert.strictEqual(Rec.topLine([]), 'Koi card nahi mila');
  assert.strictEqual(Rec.topLine(null), 'Koi card nahi mila');
});
test('topLine: zero reward', () => {
  assert.strictEqual(Rec.topLine([{ name: 'X Card', savings: 0, rate: 0 }]), 'X Card → is category pe reward nahi');
});
test('topLine: normal + capped note', () => {
  assert.strictEqual(Rec.topLine([{ name: 'HDFC', savings: 50, rate: 5, capped: false }]), 'HDFC → ₹50 bachenge (5%)');
  assert.strictEqual(Rec.topLine([{ name: 'HDFC', savings: 50, rate: 5, capped: true }]), 'HDFC → ₹50 bachenge (5%) (cap tak)');
});

// ---- offers.detectBank for the previously-unasserted banks ----
test('detectBank covers OneCard/Citi/IndusInd/Yes/StanChart/DBS/Federal/IDFC/AU/BoB', () => {
  assert.strictEqual(O.detectBank('OneCard metal ₹500 off'), 'OneCard');
  assert.strictEqual(O.detectBank('Citi bank credit card'), 'Citi');
  assert.strictEqual(O.detectBank('IndusInd Bank offer'), 'IndusInd');
  assert.strictEqual(O.detectBank('Yes Bank card'), 'Yes Bank');
  assert.strictEqual(O.detectBank('Standard Chartered card'), 'Standard Chartered');
  assert.strictEqual(O.detectBank('DBS bank instant discount'), 'DBS Bank');
  assert.strictEqual(O.detectBank('Federal Bank credit card'), 'Federal Bank');
  assert.strictEqual(O.detectBank('IDFC FIRST card'), 'IDFC FIRST');
  assert.strictEqual(O.detectBank('AU Small Finance Bank card'), 'AU Small Finance Bank');
  assert.strictEqual(O.detectBank('Bank of Baroda card'), 'Bank of Baroda');
});
test('detectBank: no bank -> null', () => {
  assert.strictEqual(O.detectBank('flat 10% off no cost emi'), null);
});
test('offers: bank present but no percent/flat -> value 0 (kind other)', () => {
  const off = O.parseOffer('HDFC Bank credit card offers available', 1000);
  assert.ok(off && off.bank === 'HDFC');
  assert.strictEqual(O.offerValue(off, 1000), 0);
});

// ---- premium pricing constants + multi_compare_export ----
test('premium pricing constants are the published values', () => {
  assert.strictEqual(P.PREMIUM_MONTHLY_INR, 49);
  assert.strictEqual(P.PREMIUM_YEARLY_INR, 399);
  assert.strictEqual(P.PRO_MONTHLY_INR, 99);
  assert.strictEqual(P.PRO_YEARLY_INR, 799);
  assert.strictEqual(P.PREMIUM_TRIAL_DAYS, 30);
  assert.ok(/cardwiz\.in\/pricing/.test(P.PRICING_URL));
});
test('premium: multi_compare_export is a premium feature', () => {
  assert.strictEqual(P.isPremiumFeature('multi_compare_export'), true);
  assert.strictEqual(P.canUseFeature('multi_compare_export', false), false);
  assert.strictEqual(P.canUseFeature('multi_compare_export', true), true);
});

// ---- cardreferral disclosure + apply url ----
test('cardreferral: DISCLOSURE present + getApplyUrl fallback for a card', () => {
  assert.ok(typeof Ref.DISCLOSURE === 'string' && Ref.DISCLOSURE.length > 10);
  const u = Ref.getApplyUrl({ id: 'hdfc-millennia', name: 'HDFC Millennia' });
  assert.ok(typeof u === 'string' && u.length > 0);
  assert.strictEqual(Ref.getApplyUrl(null), null);
});
test('cardreferral: getFeaturedApplyUrl returns a usable url for a card', () => {
  const u = Ref.getFeaturedApplyUrl({ id: 'hdfc-millennia', name: 'HDFC Millennia' });
  assert.ok(typeof u === 'string' && u.length > 0);
});

console.log(`\n${passed} tests passed.`);
