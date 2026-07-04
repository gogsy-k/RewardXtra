/*
 * CardWiz — Bank Offer Parser (Phase 3 extension)
 * -------------------------------------------------------
 * Checkout page pe dikhne wale "Bank Offers / No Cost EMI" text ko parse karta hai:
 *   "10% Instant Discount up to ₹1,500 on HDFC Bank Credit Card EMI Transactions"
 *   -> { bank:'HDFC', kind:'percent', percent:10, cap:1500, creditOnly:true }
 *
 * Pure logic, koi DOM nahi — Node mein testable. PRINCIPLE: sirf PADHTA hai.
 */

// Text pattern -> canonical bank. Pehle 6 cards.json ke `bank` se match karte hain;
// baaki sirf display ke liye (un cards ka reward data hamare paas nahi).
const BANK_PATTERNS = [
  { bank: 'HDFC', re: /hdfc/i },
  { bank: 'ICICI', re: /icici/i },
  { bank: 'SBI', re: /\bsbi\b|state bank/i },
  { bank: 'Axis', re: /axis/i },
  { bank: 'IDFC FIRST', re: /idfc/i },
  { bank: 'American Express', re: /amex|american express/i },
  { bank: 'Kotak', re: /kotak/i },
  { bank: 'OneCard', re: /onecard|one card/i },
  { bank: 'RBL', re: /\brbl\b/i },
  { bank: 'Yes Bank', re: /yes bank/i },
  { bank: 'IndusInd', re: /indusind/i },
  { bank: 'Citi', re: /citi/i },
  { bank: 'Bank of Baroda', re: /bank of baroda|\bbob\b/i },
  { bank: 'Federal Bank', re: /federal bank/i },
  // canonical naam catalog (data/cards.json) ke `bank` se BILKUL match hone chahiye — warna
  // bank-wide offer owned card se attach nahi hoga (offersByBank[r.bank] exact key lookup).
  { bank: 'HSBC', re: /hsbc/i },
  { bank: 'Standard Chartered', re: /standard chartered|\bsc\s*bank/i },
  { bank: 'AU Small Finance Bank', re: /\bau\s*(?:small finance|bank|credit|debit)|\bau sfb\b/i },
  { bank: 'DBS Bank', re: /\bdbs\b/i },
];

function detectBank(text) {
  for (const { bank, re } of BANK_PATTERNS) if (re.test(text)) return bank;
  return null;
}

function toNum(s) {
  if (!s) return null;
  const n = parseFloat(String(s).replace(/,/g, ''));
  return isNaN(n) ? null : n;
}

/**
 * Ek offer string parse karo. Bank na mile to null.
 * @returns {null | {bank, kind, percent, flat, cap, creditOnly, debitOnly, raw}}
 */
function parseOffer(text) {
  if (!text) return null;
  const bank = detectBank(text);
  if (!bank) return null; // bina bank ke offer kaam ka nahi

  // "credit" / "debit" ka zikr kaafi (poora "credit card" zaroori nahi) — "Credit and Debit
  // Cards" jaisa text pehle galti se debit-only ban jaata tha (credit path chhoot jaata).
  const isCredit = /\bcredit\b/i.test(text);
  const isDebit = /\bdebit\b/i.test(text);
  const noCostEmi = /no\s*cost\s*emi/i.test(text);

  const pct = text.match(/(\d+(?:\.\d+)?)\s*%/);
  const flat = text.match(/(?:flat\s*)?(?:(?:₹|rs\.?|inr)\s*)?([\d,]+(?:\.\d+)?)\s*off\b/i);
  // Cap ("up to ₹X" / "max discount ₹X"). Currency ZAROORI — warna "up to 10%" me 10 cap ban
  // jata (10% instant off ka 10 cap → offer ₹10 galat). Cap hamesha ₹-value hota hai.
  const cap = text.match(/(?:up\s*to|upto|max(?:imum)?(?:\s*discount)?(?:\s*of)?)\s*(?:₹|rs\.?|inr)\s*([\d,]+)/i);
  // Minimum spend/order ("on min spend of ₹3,500", "min order value ₹999", "orders above ₹500").
  const minSpend = text.match(/(?:min(?:imum)?\.?\s*(?:spend|order|purchase|transaction|txn|cart|amount|value)?(?:\s*(?:value|of|amount|spend))?|orders?\s+(?:above|over)|above|purchase\s+of)\s*(?:of\s*)?(?:₹|rs\.?|inr)\s*([\d,]+)/i);

  // EMI-only? "…Credit Card EMI…" jahan koi non-EMI credit-card path nahi. Normal purchase pe
  // ye instant off milta hi nahi — isliye bank-wide me skip (warna har EMI offer flat off dikhta).
  const emiOnly = (/credit\s*card\s*emi/i.test(text) && !/credit\s*card(?!\s*emi)/i.test(text))
    || /emi\s*(?:transactions?\s*)?only/i.test(text);

  let kind, percent = null, flatOff = null;
  if (pct) { kind = 'percent'; percent = parseFloat(pct[1]); }
  else if (flat) { kind = 'flat'; flatOff = toNum(flat[1]); }
  else if (noCostEmi) { kind = 'nocostemi'; }
  else { kind = 'other'; }

  return {
    bank,
    kind,
    percent,
    flat: flatOff,
    cap: cap ? toNum(cap[1]) : null,
    minSpend: minSpend ? toNum(minSpend[1]) : null,
    emiOnly,
    creditOnly: isCredit && !isDebit,
    debitOnly: isDebit && !isCredit,
    raw: text.replace(/\s+/g, ' ').trim().slice(0, 140),
  };
}

/**
 * Is purchase pe offer ki estimated ₹ value.
 * nocostemi/other ke liye 0 (₹ value model nahi karte).
 */
function offerValue(offer, amount) {
  if (!offer || !amount || amount <= 0) return 0;
  if (offer.minSpend && amount < offer.minSpend) return 0; // min-spend pura nahi hua → offer nahi milega
  if (offer.kind === 'percent' && offer.percent) {
    let v = amount * (offer.percent / 100);
    if (offer.cap) v = Math.min(v, offer.cap);
    return Math.round(v);
  }
  if (offer.kind === 'flat' && offer.flat) return offer.flat;
  return 0;
}

/**
 * Offer texts list -> best offer per bank (₹ value ke hisaab se).
 * Debit-only offers credit-card recommender ke liye skip.
 * @returns {Object} { bankName: {offer, value} }
 */
function bestOffersByBank(texts, amount) {
  const byBank = {};
  for (const t of texts || []) {
    const o = parseOffer(t);
    if (!o || o.debitOnly || o.emiOnly) continue; // debit-only + EMI-only credit recommender ke liye skip
    const v = offerValue(o, amount);
    if (!byBank[o.bank] || v > byBank[o.bank].value) byBank[o.bank] = { offer: o, value: v };
  }
  return byBank;
}

// ---------- Exports (browser/worker/node) ----------
// unique const naam — classic scripts shared global scope mein collide na ho.
const offersApi = { detectBank, parseOffer, offerValue, bestOffersByBank };
if (typeof module !== 'undefined' && module.exports) module.exports = offersApi;
if (typeof globalThis !== 'undefined') globalThis.CardWizOffers = offersApi;
