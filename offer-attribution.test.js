/*
 * content-detect.js — matchCardOffer (card <-> on-page offer attribution).
 * Chalao:  node offer-attribution.test.js
 * The trust-critical logic: attribute a page offer to the right saved card by
 * last4 + bank, never over-crediting. Pure (no DOM); exercised via the export.
 */
const assert = require('assert');
const { matchCardOffer } = require('./content-detect');

let passed = 0;
function test(name, fn) {
  try { fn(); passed++; console.log(`  ✓ ${name}`); }
  catch (e) { console.error(`  ✗ ${name}\n      ${e.message}`); process.exitCode = 1; }
}
const offer = (ctx, amt) => ({ ctx: ctx.toLowerCase(), amt });

console.log('CardWiz — Offer Attribution (matchCardOffer) Tests\n');

test('empty offers -> 0', () => {
  assert.strictEqual(matchCardOffer('ICICI Coral', 'ICICI', ['3003'], []), 0);
  assert.strictEqual(matchCardOffer('ICICI Coral', 'ICICI', ['3003'], null), 0);
});

test('last4 + bank match -> returns the offer amount', () => {
  const offers = [offer('ICICI Bank Credit Card ending in 3003 flat ₹500 off', 500)];
  assert.strictEqual(matchCardOffer('ICICI Coral', 'ICICI', ['3003'], offers), 500);
});

test('last4 hit but BANK mismatch -> skipped (no credit)', () => {
  // ctx says HDFC, card is ICICI, same last4 -> must NOT attribute.
  const offers = [offer('HDFC Bank Credit Card ending in 3003 flat ₹500 off', 500)];
  assert.strictEqual(matchCardOffer('ICICI Coral', 'ICICI', ['3003'], offers), 0);
});

test('name-token + bank match (no last4)', () => {
  const offers = [offer('Amazon Pay ICICI card get ₹300 off', 300)];
  assert.strictEqual(matchCardOffer('Amazon Pay ICICI', 'ICICI', [], offers), 300);
});

test('generic-only name -> 0 (never over-credit)', () => {
  // "ICICI Bank Credit Card" has only generic tokens -> no distinctive token -> 0.
  const offers = [offer('ICICI Bank Credit Card special ₹700 off', 700)];
  assert.strictEqual(matchCardOffer('ICICI Bank Credit Card', 'ICICI', [], offers), 0);
});

test('two cards sharing a last4 -> each attributes (same offer)', () => {
  const offers = [offer('HDFC Bank card ending in 3003 ₹500 off', 500)];
  assert.strictEqual(matchCardOffer('HDFC Millennia', 'HDFC', ['3003'], offers), 500);
  assert.strictEqual(matchCardOffer('HDFC Regalia', 'HDFC', ['3003'], offers), 500);
});

test('multiple matching offers -> minimum amount (conservative)', () => {
  const offers = [
    offer('Axis Bank card ending in 1234 ₹800 off', 800),
    offer('Axis Bank card ending in 1234 ₹450 off', 450),
  ];
  assert.strictEqual(matchCardOffer('Axis Atlas', 'Axis', ['1234'], offers), 450);
});

test('concatenated last4 text ("•3003no cost emi") still extracts 3003', () => {
  const offers = [offer('Axis Bank •3003no cost emi ₹200 off', 200)];
  assert.strictEqual(matchCardOffer('Axis Ace', 'Axis', ['3003'], offers), 200);
});

test('xx / masked last4 format matches', () => {
  const offers = [offer('SBI card xx7788 gets ₹150 off', 150)];
  assert.strictEqual(matchCardOffer('SBI Cashback', 'SBI', ['7788'], offers), 150);
});

test('no last4 in wallet + no name match -> 0', () => {
  const offers = [offer('HDFC Bank card ending in 9999 ₹500 off', 500)];
  assert.strictEqual(matchCardOffer('HDFC Millennia', 'HDFC', [], offers), 0);
});

test('SBI bank-word boundary: "sbi" in ctx matches, unrelated text does not', () => {
  const good = [offer('SBI card ending in 4444 ₹100 off', 100)];
  const bad = [offer('Some other bank ending in 4444 ₹100 off', 100)];
  assert.strictEqual(matchCardOffer('SBI SimplyCLICK', 'SBI', ['4444'], good), 100);
  assert.strictEqual(matchCardOffer('SBI SimplyCLICK', 'SBI', ['4444'], bad), 0);
});

test('claimed set is populated on a match', () => {
  const offers = [offer('ICICI Bank card ending in 3003 ₹500 off', 500)];
  const claimed = new Set();
  matchCardOffer('ICICI Coral', 'ICICI', ['3003'], offers, claimed);
  assert.strictEqual(claimed.size, 1);
});

console.log(`\n${passed} tests passed.`);
