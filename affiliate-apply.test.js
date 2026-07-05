/*
 * affiliate.js — cardApplyUrl + INRDeals CPA maps (the monetization core).
 * Chalao:  node affiliate-apply.test.js
 */
const assert = require('assert');
const A = require('./affiliate');

let passed = 0;
function test(name, fn) {
  try { fn(); passed++; console.log(`  ✓ ${name}`); }
  catch (e) { console.error(`  ✗ ${name}\n      ${e.message}`); process.exitCode = 1; }
}

console.log('CardWiz — Affiliate Apply (cardApplyUrl / INRDeals CPA) Tests\n');

const PUB = 'gur478927530';
const isInrDeals = (u) => typeof u === 'string' && u.startsWith('https://inr.deals/redirect?') && u.includes(`id=${PUB}`) && u.includes('&campaign=');

test('every CARD_APPLY_AFFILIATE value is a tracked INRDeals CPA link', () => {
  const bad = Object.entries(A.CARD_APPLY_AFFILIATE).filter(([, u]) => !isInrDeals(u)).map(([k]) => k);
  assert.deepStrictEqual(bad, [], `not INRDeals: ${bad.join(', ')}`);
});

test('every BANK_APPLY_AFFILIATE value is a tracked INRDeals CPA link', () => {
  const bad = Object.entries(A.BANK_APPLY_AFFILIATE).filter(([, u]) => !isInrDeals(u)).map(([k]) => k);
  assert.deepStrictEqual(bad, [], `not INRDeals: ${bad.join(', ')}`);
});

test('cardApplyUrl: card-specific CPA overrides bank-level (priority #1)', () => {
  // scapia-federal has a card-specific CPA -> apply.scapia.cards, NOT the Federal bank page.
  const url = A.cardApplyUrl('Federal Bank', 'scapia-federal');
  assert.ok(isInrDeals(url), 'expected INRDeals link');
  assert.ok(url.includes('scapia.cards'), `expected scapia target, got ${url}`);
});

test('cardApplyUrl: earning bank-level CPA when no card-specific (priority #2)', () => {
  const url = A.cardApplyUrl('HDFC', 'some-hdfc-card-without-specific-map');
  assert.ok(isInrDeals(url), `expected INRDeals link, got ${url}`);
  assert.ok(url.includes('hdfcbank'), 'expected HDFC target');
});

test('cardApplyUrl: non-earning bank -> generic page (string, not INRDeals) (priority #3)', () => {
  const url = A.cardApplyUrl('ICICI', 'amazon-pay-icici');
  assert.strictEqual(typeof url, 'string');
  assert.ok(!url.includes('inr.deals'), 'ICICI is non-earning -> should be a generic bank page');
  assert.ok(/icici/i.test(url), `expected an ICICI url, got ${url}`);
});

test('cardApplyUrl: unknown bank -> null (no Apply button)', () => {
  assert.strictEqual(A.cardApplyUrl('Totally Unknown Bank', 'whatever'), null);
  assert.strictEqual(A.cardApplyUrl(undefined, undefined), null);
});

test('cardApplyUrl: earning card ids each resolve to a tracked link', () => {
  for (const id of Object.keys(A.CARD_APPLY_AFFILIATE)) {
    assert.ok(isInrDeals(A.cardApplyUrl('anything', id)), `card ${id} did not resolve to INRDeals`);
  }
});

test('INRDeals link shape: id + src=cardwiz + url + campaign', () => {
  const url = A.cardApplyUrl('SBI', 'sbi-cashback'); // card-specific cpa_cb
  assert.ok(url.includes(`id=${PUB}`));
  assert.ok(url.includes('src=cardwiz'));
  assert.ok(url.includes('&url=http'));
  assert.ok(url.includes('&campaign='));
});

// Documents the KNOWN latent bug: inrApply raw-appends the target without encodeURIComponent.
// Safe today (no CPA target carries a query string); this test flags the day one does.
test('DOC: apply targets are raw-appended (no target currently carries a query string)', () => {
  const targets = [...Object.values(A.CARD_APPLY_AFFILIATE), ...Object.values(A.BANK_APPLY_AFFILIATE)]
    .map((u) => decodeURIComponent((u.match(/&url=([^&]*(?:&(?!campaign=)[^&]*)*)/) || [])[1] || ''));
  // Extract the url= segment up to &campaign= and ensure none contain a '?...=' query today.
  const withQuery = [...Object.values(A.CARD_APPLY_AFFILIATE), ...Object.values(A.BANK_APPLY_AFFILIATE)]
    .filter((u) => {
      const seg = u.split('&url=')[1] || '';
      const target = seg.split('&campaign=')[0];
      return target.includes('?');
    });
  assert.deepStrictEqual(withQuery, [], `targets with a query string would corrupt &campaign=: ${withQuery.join(' | ')}`);
});

test('DISCLOSURE string is present (transparency requirement)', () => {
  assert.ok(typeof A.DISCLOSURE === 'string' && A.DISCLOSURE.length > 10);
});

console.log(`\n${passed} tests passed.`);
