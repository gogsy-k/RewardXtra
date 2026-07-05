/*
 * portfolioscore.js tests.  Chalao:  node portfolioscore.test.js
 * 5 categories x 20 = 100. Covered = a wallet card has an above-base rule (or lounge/fuel benefit).
 */
const assert = require('assert');
const { portfolioScore, SCORE_CATS } = require('./portfolioscore');

let passed = 0;
function test(name, fn) {
  try { fn(); passed++; console.log(`  ✓ ${name}`); }
  catch (e) { console.error(`  ✗ ${name}\n      ${e.message}`); process.exitCode = 1; }
}

console.log('CardWiz — Portfolio Score Tests\n');

// ---- tiny catalog fixtures ----
const onlineCard = { id: 'online1', name: 'Online Card', bank: 'HDFC', baseRate: 1,
  rules: [{ categories: ['amazon'], effectiveRate: 5 }] };
const travelCard = { id: 'travel1', name: 'Travel Card', bank: 'Axis', baseRate: 1,
  rules: [{ categories: ['flights'], effectiveRate: 6 }] };
const diningCard = { id: 'dining1', name: 'Dining Card', bank: 'SBI', baseRate: 1,
  rules: [{ categories: ['food_delivery'], effectiveRate: 5 }] };
const fuelRuleCard = { id: 'fuel1', name: 'Fuel Rule Card', bank: 'BPCL', baseRate: 1,
  rules: [{ categories: ['fuel'], effectiveRate: 4 }] };
const fuelWaiverCard = { id: 'fuel2', name: 'Fuel Waiver Card', bank: 'IOC', baseRate: 1,
  fuelSurchargeWaiver: true, rules: [] };
const loungeCard = { id: 'lounge1', name: 'Lounge Card', bank: 'HDFC', baseRate: 1,
  benefits: { loungePerYear: 8 }, rules: [] };
// card whose accelerated rule is NOT above base -> should NOT count as coverage
const weakCard = { id: 'weak1', name: 'Weak Card', bank: 'XYZ', baseRate: 5,
  rules: [{ categories: ['amazon'], effectiveRate: 5 }] };
// BUG-GUARD fixture: catalog card with NO rules array at all
const noRulesCard = { id: 'norules1', name: 'No Rules Card', bank: 'ABC', baseRate: 1 };

const FULL_CATALOG = [onlineCard, travelCard, diningCard, fuelRuleCard, fuelWaiverCard, loungeCard, weakCard, noRulesCard];

test('SCORE_CATS has 5 categories', () => {
  assert.strictEqual(SCORE_CATS.length, 5);
});

test('empty wallet -> score 0, all 5 gaps, a suggestion per gap', () => {
  const r = portfolioScore([], FULL_CATALOG);
  assert.strictEqual(r.score, 0);
  assert.strictEqual(r.gaps.length, 5);
  assert.strictEqual(r.strengths.length, 0);
  assert.ok(r.suggestions.length >= 1);
});

test('all 5 categories covered -> score 100, no gaps', () => {
  const wallet = [
    { cardId: 'online1' }, { cardId: 'travel1' }, { cardId: 'dining1' },
    { cardId: 'fuel1' }, { cardId: 'lounge1' },
  ];
  const r = portfolioScore(wallet, FULL_CATALOG);
  assert.strictEqual(r.score, 100);
  assert.strictEqual(r.gaps.length, 0);
  assert.strictEqual(r.suggestions.length, 0);
});

test('lounge covered via benefits.loungePerYear (non-zero)', () => {
  const r = portfolioScore([{ cardId: 'lounge1' }], FULL_CATALOG);
  const lounge = r.details.find((d) => d.id === 'lounge');
  assert.strictEqual(lounge.covered, true);
});

test('lounge NOT covered when loungePerYear is 0', () => {
  const zero = { id: 'z', name: 'Z', bank: 'B', baseRate: 1, benefits: { loungePerYear: 0 }, rules: [] };
  const r = portfolioScore([{ cardId: 'z' }], [zero]);
  assert.strictEqual(r.details.find((d) => d.id === 'lounge').covered, false);
});

test('fuel covered via top-level fuelSurchargeWaiver', () => {
  const r = portfolioScore([{ cardId: 'fuel2' }], FULL_CATALOG);
  assert.strictEqual(r.details.find((d) => d.id === 'fuel').covered, true);
});

test('fuel covered via a fuel-category rule', () => {
  const r = portfolioScore([{ cardId: 'fuel1' }], FULL_CATALOG);
  assert.strictEqual(r.details.find((d) => d.id === 'fuel').covered, true);
});

test('online covered when effectiveRate > baseRate', () => {
  const r = portfolioScore([{ cardId: 'online1' }], FULL_CATALOG);
  assert.strictEqual(r.details.find((d) => d.id === 'online').covered, true);
  assert.strictEqual(r.score, 20);
});

test('online NOT covered when accelerated rate == baseRate (not above)', () => {
  const r = portfolioScore([{ cardId: 'weak1' }], [weakCard]);
  assert.strictEqual(r.details.find((d) => d.id === 'online').covered, false);
  assert.strictEqual(r.score, 0);
});

test('wallet card not in catalog is silently dropped', () => {
  const r = portfolioScore([{ cardId: 'ghost-card-not-in-catalog' }], FULL_CATALOG);
  assert.strictEqual(r.score, 0);
});

test('BUG GUARD: catalog card with no rules[] must not throw', () => {
  // Regression for the unguarded c.rules.some/.filter TypeError.
  assert.doesNotThrow(() => portfolioScore([{ cardId: 'norules1' }], FULL_CATALOG));
  const r = portfolioScore([{ cardId: 'norules1' }], FULL_CATALOG);
  assert.strictEqual(r.score, 0); // no coverage, but no crash
});

test('BUG GUARD: a no-rules card in the SUGGESTION catalog must not throw', () => {
  // gaps -> rateFor()/filter() walk the whole catalog including noRulesCard
  assert.doesNotThrow(() => portfolioScore([{ cardId: 'online1' }], FULL_CATALOG));
});

test('suggestions exclude cards already owned', () => {
  const r = portfolioScore([{ cardId: 'travel1' }], FULL_CATALOG);
  assert.ok(!r.suggestions.some((s) => s.cardId === 'travel1'));
});

test('suggestion for a gap points at a real catalog card for that gap', () => {
  const r = portfolioScore([], FULL_CATALOG);
  const onlineSug = r.suggestions.find((s) => s.forGap === 'online');
  assert.ok(onlineSug, 'expected an online-gap suggestion');
  assert.ok(FULL_CATALOG.some((c) => c.id === onlineSug.cardId));
});

console.log(`\n${passed} tests passed.`);
