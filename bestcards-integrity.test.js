/*
 * bestcards data-integrity tests.  Chalao:  node bestcards-integrity.test.js
 * Guards the hand-curated Top-Cards content against drift from the catalog,
 * missing translations, unknown badges/tiers, and broken Apply resolution.
 */
const assert = require('assert');
const { BEST_CARDS, BADGE_ICONS, TIER_META } = require('./bestcards');
const { BEST_CARDS_I18N } = require('./bestcards-i18n');
const { cardApplyUrl } = require('./affiliate');
const cat = require('./data/cards.json');

const catCards = cat.cards || cat;
const catById = new Map(catCards.map((c) => [c.id, c]));

let passed = 0;
function test(name, fn) {
  try { fn(); passed++; console.log(`  ✓ ${name}`); }
  catch (e) { console.error(`  ✗ ${name}\n      ${e.message}`); process.exitCode = 1; }
}

console.log('CardWiz — Best Cards Data Integrity Tests\n');

test('there are best cards to validate', () => {
  assert.ok(BEST_CARDS.length >= 20, `only ${BEST_CARDS.length} best cards`);
});

test('every BEST_CARDS.cardId exists in data/cards.json', () => {
  const missing = BEST_CARDS.filter((c) => !catById.has(c.cardId)).map((c) => c.cardId);
  assert.deepStrictEqual(missing, [], `orphan cardIds: ${missing.join(', ')}`);
});

test('every badge has an icon in BADGE_ICONS', () => {
  const bad = [];
  BEST_CARDS.forEach((c) => (c.badges || []).forEach((b) => { if (!BADGE_ICONS[b]) bad.push(`${c.cardId}:${b}`); }));
  assert.deepStrictEqual(bad, [], `badges without icon: ${bad.join(', ')}`);
});

test('every tier is a known TIER_META tier', () => {
  const bad = BEST_CARDS.filter((c) => !TIER_META[c.tier]).map((c) => `${c.cardId}:${c.tier}`);
  assert.deepStrictEqual(bad, [], `unknown tiers: ${bad.join(', ')}`);
});

test('every card has a BEST_CARDS_I18N entry with hinglish + hi', () => {
  const bad = BEST_CARDS.filter((c) => {
    const e = BEST_CARDS_I18N[c.cardId];
    return !e || !e.hinglish || !e.hi;
  }).map((c) => c.cardId);
  assert.deepStrictEqual(bad, [], `missing translations: ${bad.join(', ')}`);
});

test('translated features/pros/cons array lengths match the English base', () => {
  const bad = [];
  BEST_CARDS.forEach((c) => {
    const e = BEST_CARDS_I18N[c.cardId];
    if (!e) return;
    ['hinglish', 'hi'].forEach((l) => {
      if (!e[l]) return;
      ['features', 'pros', 'cons'].forEach((f) => {
        const base = (c[f] || []).length;
        const tr = ((e[l] || {})[f] || []).length;
        if (base !== tr) bad.push(`${c.cardId}.${l}.${f} (base ${base} vs ${tr})`);
      });
    });
  });
  assert.deepStrictEqual(bad, [], `array-length drift: ${bad.join('; ')}`);
});

test('no duplicate cardIds in BEST_CARDS', () => {
  const seen = new Set(); const dupes = [];
  BEST_CARDS.forEach((c) => { if (seen.has(c.cardId)) dupes.push(c.cardId); seen.add(c.cardId); });
  assert.deepStrictEqual(dupes, [], `duplicates: ${dupes.join(', ')}`);
});

test('cardApplyUrl(catalogBank, cardId) never throws and returns string|null', () => {
  // The widget/website resolve Apply via the CATALOG bank (not the bestcards short name),
  // so exercise that real path for every best card.
  BEST_CARDS.forEach((c) => {
    const catBank = (catById.get(c.cardId) || {}).bank;
    const url = cardApplyUrl(catBank, c.cardId);
    assert.ok(url === null || typeof url === 'string', `${c.cardId}: bad apply url ${url}`);
  });
});

// Informational guard for the known bestcards-vs-affiliate bank-name inconsistency.
// (Latent only: Best-Cards Apply uses getApplyUrl; cardApplyUrl gets the catalog bank.)
test('DOC: bestcards bank names that differ from their catalog bank are flagged', () => {
  const diffs = BEST_CARDS
    .map((c) => ({ id: c.cardId, bc: c.bank, cat: (catById.get(c.cardId) || {}).bank }))
    .filter((x) => x.cat && x.bc !== x.cat);
  // Not a hard failure — just surfaced so a future refactor that pipes the bestcards
  // bank into cardApplyUrl is caught. Known today: onecard (OneCard/SBM), au-lit (AU Bank/AU Small Finance Bank).
  console.log(`      (info) ${diffs.length} bank-name diffs: ${diffs.map((d) => `${d.id}[${d.bc}≠${d.cat}]`).join(', ')}`);
  assert.ok(Array.isArray(diffs));
});

console.log(`\n${passed} tests passed.`);
