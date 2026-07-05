/*
 * CardWiz — Portfolio Score
 * 5 categories × 20 pts = 100 max.
 * Checks if any wallet card has a specific rule (above base rate) for each category.
 * Pure logic — no DOM, no chrome. Testable in Node.
 */
'use strict';

const SCORE_CATS = [
  { id: 'online',  label: 'Online / Cashback', emoji: '🛒', cats: ['amazon','flipkart','online_shopping','myntra','entertainment'] },
  { id: 'travel',  label: 'Travel',             emoji: '✈️', cats: ['travel','flights','hotels','uber','cab'] },
  { id: 'dining',  label: 'Dining & Food',      emoji: '🍽️', cats: ['dining','food_delivery','instamart'] },
  { id: 'fuel',    label: 'Fuel',               emoji: '⛽', cats: ['fuel'] },
  { id: 'lounge',  label: 'Airport Lounge',     emoji: '🛋️', cats: [] },
];

function portfolioScore(walletCards, allCatalogCards) {
  const myCards = walletCards
    .map((mc) => allCatalogCards.find((c) => c.id === mc.cardId))
    .filter(Boolean);

  const details = SCORE_CATS.map((cat) => {
    let covered = false;
    if (cat.id === 'lounge') {
      covered = myCards.some(
        (c) => c.benefits && c.benefits.loungePerYear !== 0 && c.benefits.loungePerYear !== undefined
      );
    } else if (cat.id === 'fuel') {
      covered = myCards.some(
        (c) =>
          c.fuelSurchargeWaiver ||
          (c.benefits && c.benefits.fuelSurchargeWaiver) ||
          (c.rules || []).some((r) => r.categories && r.categories.includes('fuel'))
      );
    } else {
      covered = myCards.some((c) =>
        (c.rules || []).some(
          (r) =>
            r.categories &&
            r.categories.some((rc) => cat.cats.includes(rc)) &&
            (r.effectiveRate || 0) > (c.baseRate || 0)
        )
      );
    }
    return { ...cat, covered, points: covered ? 20 : 0 };
  });

  const score = details.reduce((s, d) => s + d.points, 0);
  const strengths = details.filter((d) => d.covered);
  const gaps = details.filter((d) => !d.covered);

  // Top suggestion per gap — highest rate for that category, not already in wallet.
  const myCardIds = new Set(walletCards.map((mc) => mc.cardId));
  const suggestions = [];
  for (const gap of gaps) {
    const rateFor = (c) => {
      if (gap.id === 'lounge' || gap.id === 'fuel') return 1;
      return Math.max(
        0,
        ...(c.rules || [])
          .filter((r) => r.categories && r.categories.some((rc) => gap.cats.includes(rc)))
          .map((r) => r.effectiveRate || 0)
      );
    };
    const best = allCatalogCards
      .filter((c) => !myCardIds.has(c.id))
      .filter((c) => {
        if (gap.id === 'lounge') return c.benefits && c.benefits.loungePerYear;
        if (gap.id === 'fuel')   return c.fuelSurchargeWaiver || (c.benefits && c.benefits.fuelSurchargeWaiver);
        return (c.rules || []).some(
          (r) => r.categories && r.categories.some((rc) => gap.cats.includes(rc)) && (r.effectiveRate || 0) > (c.baseRate || 0)
        );
      })
      .sort((a, b) => rateFor(b) - rateFor(a))[0];

    if (best) {
      suggestions.push({ cardId: best.id, name: best.name, bank: best.bank, forGap: gap.id, forGapLabel: gap.label });
    }
  }

  return { score, strengths, gaps, suggestions, details };
}

const portfolioScoreApi = { portfolioScore, SCORE_CATS };
if (typeof module !== 'undefined' && module.exports) module.exports = portfolioScoreApi;
if (typeof globalThis !== 'undefined') globalThis.CardWizPortfolioScore = portfolioScoreApi;
