/*
 * CardWiz — Content Script (Phase 3: Auto Checkout Detection)
 * ------------------------------------------------------------------
 * Amazon / Flipkart / Myntra pe chalkar:
 *   1. merchant -> category map karta hai (read-only)
 *   2. cart/checkout page pe order amount padhta hai (read-only)
 *   3. recommend.js engine se best card nikaalta hai
 *   4. ek floating Shadow-DOM widget mein dikhata hai
 *
 * PRINCIPLE: Sirf PADHTA hai. Koi card number/CVV entry NAHI, koi form fill NAHI.
 *
 * Pure helpers (detectSite, isCheckoutish, parseRupee...) Node mein testable hain;
 * DOM/chrome wala init() sirf browser mein chalta hai.
 */

// ---------- Pure helpers (testable) ----------

function detectSite(hostname) {
  const h = (hostname || '').toLowerCase();
  // Exact domain ya uska subdomain hi match ho (lookalike/phishing domains nahi).
  const isDomain = (host, root) => host === root || host.endsWith('.' + root);
  // category = recommend engine ki category (cards.json rules se match honi chahiye).
  if (isDomain(h, 'amazon.in')) return { merchant: 'Amazon', category: 'amazon' };
  if (isDomain(h, 'flipkart.com')) return { merchant: 'Flipkart', category: 'flipkart' };
  if (isDomain(h, 'myntra.com')) return { merchant: 'Myntra', category: 'myntra' };
  // Food delivery
  if (isDomain(h, 'swiggy.com')) return { merchant: 'Swiggy', category: 'food_delivery' };
  if (isDomain(h, 'zomato.com')) return { merchant: 'Zomato', category: 'food_delivery' };
  // Grocery / quick-commerce
  if (isDomain(h, 'bigbasket.com')) return { merchant: 'BigBasket', category: 'grocery' };
  if (isDomain(h, 'blinkit.com')) return { merchant: 'Blinkit', category: 'grocery' };
  if (isDomain(h, 'zeptonow.com')) return { merchant: 'Zepto', category: 'grocery' };
  // Fashion / shopping
  if (isDomain(h, 'nykaa.com')) return { merchant: 'Nykaa', category: 'online_shopping' };
  if (isDomain(h, 'ajio.com')) return { merchant: 'Ajio', category: 'online_shopping' };
  if (isDomain(h, 'meesho.com')) return { merchant: 'Meesho', category: 'online_shopping' };
  if (isDomain(h, 'tatacliq.com')) return { merchant: 'Tata CLiQ', category: 'online_shopping' };
  // Travel
  if (isDomain(h, 'makemytrip.com')) return { merchant: 'MakeMyTrip', category: 'travel' };
  if (isDomain(h, 'cleartrip.com')) return { merchant: 'Cleartrip', category: 'travel' };
  if (isDomain(h, 'irctc.co.in')) return { merchant: 'IRCTC', category: 'travel' };
  // Entertainment
  if (isDomain(h, 'bookmyshow.com')) return { merchant: 'BookMyShow', category: 'entertainment' };
  return null;
}

// Sirf cart/checkout/payment jaise pages pe widget dikhao — har page pe nahi.
function isCheckoutish(pathAndSearch) {
  const u = (pathAndSearch || '').toLowerCase();
  return /(cart|checkout|\/buy|payment|\/gp\/buy|order-summary|bag|booking|\/review|order-payment|buytickets)/.test(u);
}

// "₹1,299.00" / "Rs. 1299" / "1,299" -> 1299  (warna null)
function parseRupee(text) {
  if (!text) return null;
  const cleaned = String(text).replace(/[,\s]/g, '');
  const m = cleaned.match(/(?:₹|rs\.?|inr)?([0-9]+(?:\.[0-9]{1,2})?)/i);
  if (!m) return null;
  const v = parseFloat(m[1]);
  return isNaN(v) || v <= 0 ? null : v;
}

// Per-site amount selectors (pehle ye try honge). Fragile — banks/sites DOM badalte hain.
const AMOUNT_SELECTORS = {
  Amazon: [
    '#sc-subtotal-amount-activecart .a-price-whole',
    '#sc-subtotal-amount-buybox .a-price-whole',
    '.grand-total-price',
    '#subtotals-marketplace-table .a-text-bold',
    '.order-summary-grand-total-price',
  ],
  Flipkart: [
    '._1dqRvU ._2-ut7f',
    '._1dqRvU',
    '.IO0WAR',
    '._3Gw2pT',
  ],
  Myntra: [
    '.priceDetail-base-grandTotal',
    '.priceDetail-base-totalAmount',
    '.pdp-price strong',
  ],
  // Naye sites — class names obfuscated/badalte rehte hain, isliye mostly
  // genericAmount() (TOTAL_LABELS) fallback pe rely karte hain. Ye best-guess hints hain.
  Swiggy: ['[data-testid="cart-total"]', '.styles_totalAmount__', '.GrandTotal'],
  Zomato: ['[class*="grand-total"]', '[class*="GrandTotal"]', '[class*="total"]'],
  BigBasket: ['.mt-summary .total', '[qa="order_total"]', '[class*="GrandTotal"]'],
  Blinkit: ['[class*="GrandTotal"]', '[class*="bill-total"]', '[class*="total"]'],
  Zepto: ['[class*="GrandTotal"]', '[class*="grandTotal"]', '[class*="total"]'],
  Nykaa: ['.total-amount', '[class*="grandTotal"]', '[class*="GrandTotal"]'],
  Ajio: ['.cart-total-value', '[class*="grandTotal"]', '[class*="totalAmount"]'],
  Meesho: ['[class*="grandTotal"]', '[class*="GrandTotal"]', '[class*="totalAmount"]'],
  'Tata CLiQ': ['[class*="grandTotal"]', '[class*="GrandTotal"]', '.total-value'],
  MakeMyTrip: ['[class*="grandTotal"]', '[class*="totalAmount"]', '.totalPrice'],
  Cleartrip: ['[class*="grandTotal"]', '[class*="totalAmount"]', '.total-amount'],
  IRCTC: ['#totalCollectibleAmount', '[class*="totalFare"]', '[class*="total"]'],
  BookMyShow: ['[class*="grandTotal"]', '[class*="totalAmount"]', '[class*="amountPayable"]'],
};

const TOTAL_LABELS = /(grand total|order total|amount payable|total payable|total amount|net payable|to pay|bill total|item total|amount to pay|payable amount|you pay|total payable amount|total fare|final amount)/i;

// ---------- DOM-dependent (browser only) ----------

const WIDGET_HOST_ID = 'cardwiz-widget-host';

// Site selectors se amount nikaalo; warna label-based generic fallback.
function detectAmount(merchant) {
  for (const sel of AMOUNT_SELECTORS[merchant] || []) {
    const el = document.querySelector(sel);
    if (el) {
      const v = parseRupee(el.textContent);
      if (v) return v;
    }
  }
  return genericAmount();
}

// Fallback: "Grand Total / Amount Payable" jaise label ke paas ka ₹ amount dhoondo.
function genericAmount() {
  const nodes = document.querySelectorAll('span, div, td, p, strong, b');
  let best = null;
  for (const node of nodes) {
    const txt = node.textContent || '';
    if (txt.length > 120) continue;          // bade blocks skip
    if (!TOTAL_LABELS.test(txt)) continue;
    // is element ya uske parent/siblings mein ₹ amount dhoondo
    const candidate =
      parseRupee(txt) ||
      parseRupee(node.parentElement && node.parentElement.textContent) ||
      parseRupee(node.nextElementSibling && node.nextElementSibling.textContent);
    if (candidate && (!best || candidate > best)) best = candidate; // sabse bada = grand total
  }
  return best;
}

// Checkout page pe dikhne wale bank-offer / No-Cost-EMI text padho (READ-ONLY).
// Heuristic: chhote text blocks jo offer-jaise lagte hain. offers.js parse karega.
const OFFER_HINT = /(instant discount|bank offer|no cost emi|cashback|%\s*off|flat\s*₹|credit card|debit card|₹\s*[\d,]+(?:\.\d+)?\s*off)/i;
const OFFER_VALUE_HINT = /(credit card|debit card|emi|instant|cashback|%|₹\s*\d)/i;

const BANK_NAME_RE = /(hdfc|icici|sbi|axis|kotak|amex|american express|indusind|yes bank|rbl|idfc|federal|standard chartered|hsbc|au bank|bob|bank of baroda|citi|onecard)/i;

// Sirf "X off on full payment" wala instant-discount pattern (screenshot wala).
// "select products" coupons / EMI / concatenated garbage ko ignore karta hai —
// warna "500.0010% off" jaise mangled text 500% ban jaata tha.
const FULLPAY_OFF_RE = /(?:₹|rs\.?|inr)?\s*([\d,]+(?:\.\d+)?)\s*off\s+on\s+full\s+payment/i;

// Payment page pe full-payment instant discount dhoondo, phir UPAR walk karke
// bank naam milao (Amazon bank-name aur amount alag elements mein rakhta hai).
function readPaymentPageOffers() {
  const offers = [];
  const leaves = document.querySelectorAll('div, li, p, span, td, b, strong');
  for (const node of leaves) {
    if (node.children.length > 3) continue;                  // leaf-ish hi
    const own = (node.textContent || '').replace(/\s+/g, ' ').trim();
    if (own.length < 8 || own.length > 220) continue;

    const m = own.match(FULLPAY_OFF_RE);
    if (!m) continue;                                        // sirf full-payment instant off
    const amt = parseFloat(m[1].replace(/,/g, ''));
    if (!amt || amt <= 0 || amt > 100000) continue;          // sanity bound

    // Upar walk karke nearest ancestor with a bank name.
    let el = node, bank = null, ctx = '';
    for (let i = 0; i < 12 && el.parentElement; i++) {
      el = el.parentElement;
      const at = el.textContent || '';
      const bm = at.match(BANK_NAME_RE);
      if (bm) { bank = bm[0]; ctx = at.toLowerCase(); break; }
    }
    if (!bank) continue;
    if (ctx.includes('debit card') && !ctx.includes('credit card')) continue; // debit-only skip

    // parseOffer ke liye pristine string — koi % nahi, sirf flat ₹X off.
    offers.push(`${bank} credit card flat ₹${amt} off`);
  }
  return [...new Set(offers)];
}

// Har card-row ka apna instant-offer (card-specific), us row ke text (ctx) ke saath —
// taaki offer sahi card se match ho (bank ke sabhi cards pe nahi). Amazon checkout:
// "Amazon Pay ICICI ... ₹3500 off with this card" vs "ICICI ... ₹7500 off".
// Amazon: "3500.00 off with this card / off on full payment"
// Flipkart: "₹5,500 discount applied. / discount applicable."
const OFFER_PHRASE_RE = /(?:₹|rs\.?|inr)?\s*([\d,]+(?:\.\d{1,2})?)\s*(?:off\s+(?:with\s+this\s+card|on\s+full\s+payment)|discount\s+(?:applied|applicable))/i;

// Card-title nodes: "Amazon Pay ICICI Bank Credit Card ending in 3012" jaise chhote
// header elements (bank naam + "ending in NNNN"). Offer inhi se attribute hota hai.
function findCardTitleNodes(D) {
  const titles = [];
  const nodes = D.querySelectorAll('div, span, p, td, b, strong, label, h1, h2, h3, h4');
  for (const n of nodes) {
    if (n.children.length > 5) continue;
    const t = (n.textContent || '').replace(/\s+/g, ' ').trim();
    if (t.length < 10 || t.length > 150) continue;
    // "ending in 3003" (Amazon) ya "• 3003" (Flipkart) ya "xx3003" — koi bhi last4 marker.
    if (!/(?:ending\s+(?:in|with)\s*|[•·*]{1,4}\s*|\bx{2,4}\s*)\d{2,4}(?!\d)/i.test(t)) continue;
    if (!BANK_NAME_RE.test(t)) continue;
    titles.push({ node: n, text: t.toLowerCase() });
  }
  return titles;
}

function readPaymentCardOffers(doc) {
  const D = doc || document;
  const out = [];
  const titles = findCardTitleNodes(D);
  let phraseSeen = 0, noCtx = 0;
  const leaves = D.querySelectorAll('div, li, p, span, td, b, strong');
  for (const node of leaves) {
    if (node.children.length > 3) continue;
    const own = (node.textContent || '').replace(/\s+/g, ' ').trim();
    if (own.length < 6 || own.length > 220) continue;
    // ₹ OPTIONAL (Amazon symbol ko alag element me rakhta hai). Strong phrase required.
    const m = own.match(OFFER_PHRASE_RE);
    if (!m) continue;
    if (/emi transaction only/i.test(own)) continue; // EMI-only offer ≠ flat instant off
    phraseSeen++;
    const amt = parseFloat(m[1].replace(/,/g, ''));
    if (!amt || amt <= 0 || amt > 100000) continue;

    // 1) TITLE-FIRST: DOM order me is offer se PEHLE wala nazdeeki card-title — tight
    //    ctx (sirf us card ka naam+last4). Ancestor-walk ka bada container kabhi-kabhi
    //    PADOSI card rows bhi nigal leta tha ("flipkart axis" ICICI ke ctx me aa gaya
    //    tha → phantom match). Title hamesha apne card tak seemit hota hai.
    let ctx = '';
    if (titles.length) {
      let best = null;
      for (const t of titles) {
        // bit 4 = DOCUMENT_POSITION_FOLLOWING → offer node title ke baad aata hai
        if (t.node.compareDocumentPosition(node) & 4) best = t;
      }
      if (best) ctx = best.text;
    }
    // 2) Fallback: titles hi na mile to ancestor-walk (chhota bank-named container).
    if (!ctx) {
      let el = node;
      for (let i = 0; i < 15 && el.parentElement; i++) {
        el = el.parentElement;
        const at = (el.textContent || '').replace(/\s+/g, ' ');
        if (at.length > 1200) break; // container ab poori list jitna bada — aage mat jao
        if (BANK_NAME_RE.test(at)) { ctx = at.toLowerCase().slice(0, 600); break; }
      }
    }
    if (ctx) out.push({ amt, ctx }); else noCtx++;
  }
  // Dedupe (same amt + same ctx ke duplicate variants: "Up to…", "Deselect…" etc.)
  const seen = new Set();
  const dedup = out.filter((o) => {
    const k = o.amt + '|' + o.ctx;
    if (seen.has(k)) return false;
    seen.add(k);
    return true;
  }).slice(0, 30);
  if (phraseSeen || dedup.length) dbg(`scan: titles:${titles.length} | phrase:${phraseSeen} | attributed:${dedup.length} | miss:${noCtx}`);
  return dedup;
}

// Top frame se: page ke saare SAME-ORIGIN-accessible iframes ka DOM seedha scan karo
// (srcdoc/same-origin frames — injection ki zaroorat nahi). Cross-origin frames apna
// scan khud postMessage se bhejte hain (frame mode).
function readAllFramesCardOffers() {
  let out = readPaymentCardOffers(document);
  const iframes = document.querySelectorAll('iframe');
  let accessible = 0;
  for (const f of iframes) {
    try {
      const d = f.contentDocument;
      if (d && d.body) {
        accessible++;
        out = out.concat(readPaymentCardOffers(d));
      }
    } catch (_) { /* cross-origin — postMessage path handle karega */ }
  }
  dbg(`iframes: ${iframes.length} total, ${accessible} directly-accessible | total card-offers: ${out.length}`);
  return out;
}

// Bank + generic words — card ke distinctive product tokens nikaalne ke liye hataao.
const OFFER_GENERIC_WORDS = new Set([
  'bank', 'credit', 'debit', 'card', 'cards', 'the', 'of', 'and', 'private', 'metal', 'signature',
  'platinum', 'plus', 'pro', 'select', 'prime', 'gold', 'classic', 'rupay', 'visa', 'mastercard',
  'icici', 'hdfc', 'sbi', 'axis', 'kotak', 'rbl', 'indusind', 'yes', 'idfc', 'hsbc', 'amex',
  'american', 'express', 'federal', 'dbs', 'baroda', 'standard', 'chartered', 'citi', 'onecard', 'first',
]);

// Card ko uske apne page-offer se match karo. Priority:
//   1) last4 — wallet me saved "•••• 3003" vs page ka "ending in 3003" = 100% pakka match
//      (generic rows jaise "ICICI Bank Credit Card ending in 3003" isi se attribute hote hain).
//   2) naam ke distinctive tokens (e.g. "amazon pay").
// No confident match -> 0 (kabhi over-credit nahi).
// ctx me se card ke last4 digits nikaalo — har site ka format alag:
//   Amazon: "ending in 3003" · Flipkart: "credit card • 3003" · aur: "xx3003", "**3003"
function ctxLast4s(ctx) {
  const out = [];
  // NOTE: \b nahi — "•3003no cost emi" jaise concatenated text me digit→letter pe \b fail
  // ho jata hai. (?!\d) = bas agla char digit na ho.
  const patterns = [
    /ending\s+(?:in|with)\s*(\d{2,4})(?!\d)/g,
    /[•·*]{1,4}\s*(\d{2,4})(?!\d)/g,
    /\bx{2,4}\s*(\d{2,4})(?!\d)/gi,
  ];
  for (const re of patterns) {
    let m;
    while ((m = re.exec(ctx))) out.push(m[1]);
  }
  return [...new Set(out)];
}

// Kya offer-ctx me card ka BANK likha hai? (last4 galti se kisi aur bank ke card pe
// daal do to offer attach nahi hoga — bank bhi match hona zaroori.)
function bankMatchesCtx(bank, ctx) {
  if (!bank || !ctx) return false;
  const b = String(bank).toLowerCase();
  if (/american express|amex/.test(b)) return /american express|amex/.test(ctx);
  if (b === 'sbi' || b.includes('state bank')) return /\bsbi\b|state bank/.test(ctx);
  if (b.startsWith('bank of')) return ctx.includes(b);              // bank of baroda / india
  let key = b.split(/\s+/)[0];                                       // icici / hdfc / axis / citi / au / dbs …
  if (key === 'standard') return ctx.includes('standard chartered');
  if (key.length <= 3) return new RegExp('\\b' + key + '\\b').test(ctx); // au/sbi/rbl/dbs — word boundary
  return ctx.includes(key);
}

function matchCardOffer(cardName, cardBank, last4List, cardOffers, claimed) {
  if (!cardOffers || !cardOffers.length) return 0;
  for (const l4 of (last4List || [])) {
    if (!l4) continue;
    const l4hits = cardOffers.filter((o) => ctxLast4s(o.ctx).includes(l4));
    const hits = l4hits.filter((o) => bankMatchesCtx(cardBank, o.ctx));
    if (l4hits.length && !hits.length) {
      dbg('⚠️ last4', l4, 'mila par BANK mismatch — card:', cardBank, '| ctx:', l4hits[0].ctx.slice(0, 60), '→ skip');
      continue;
    }
    if (hits.length) {
      if (claimed) hits.forEach((h) => claimed.add(h));
      dbg('offer matched via last4+bank', l4, '(' + cardBank + '):', cardName, '→ ₹' + Math.min(...hits.map((o) => o.amt)));
      return Math.min(...hits.map((o) => o.amt));
    }
  }
  const tokens = String(cardName).toLowerCase().replace(/[^a-z0-9 ]/g, ' ').split(/\s+/)
    .filter((t) => t.length > 2 && !OFFER_GENERIC_WORDS.has(t));
  if (!tokens.length) return 0; // koi distinctive token nahi -> safe: no offer (over-credit se bacho)
  // Naam-token match pe bhi bank verify karo.
  const matches = cardOffers.filter((o) => tokens.every((t) => o.ctx.includes(t)) && bankMatchesCtx(cardBank, o.ctx));
  if (matches.length && claimed) matches.forEach((m2) => claimed.add(m2));
  return matches.length ? Math.min(...matches.map((o) => o.amt)) : 0;
}

function readOffersFromDOM() {
  const texts = new Set();

  // Payment page specific reader (Amazon checkout step 2)
  readPaymentPageOffers().forEach((t) => texts.add(t));

  // Known offer containers (cart page — best signal)
  const scopes = [];
  ['#itembox-InstantBankDiscount', '#sopp_offers', '#bank-offer', '[class*="offer"]', '[class*="Offer"]']
    .forEach((sel) => document.querySelectorAll(sel).forEach((el) => scopes.push(el)));
  const root = scopes.length ? scopes : [document.body];

  let count = 0;
  for (const scope of root) {
    const nodes = scope.querySelectorAll('li, p, span, div');
    for (const n of nodes) {
      if (count++ > 5000) break;
      const t = (n.textContent || '').replace(/\s+/g, ' ').trim();
      if (t.length < 15 || t.length > 250) continue;
      if (OFFER_HINT.test(t) && OFFER_VALUE_HINT.test(t)) texts.add(t);
    }
  }
  return [...texts].slice(0, 20);
}

// Wallet + cap usage ek saath padho (read-only).
function getWalletState() {
  return new Promise((resolve) => {
    if (typeof chrome === 'undefined' || !chrome.storage) return resolve({ owned: [], capUsage: null, myCards: [], isPremium: false });
    chrome.storage.local.get(['myCards', 'capUsage', 'isPremium'], (r) => {
      const mc = r.myCards || [];
      resolve({ owned: [...new Set(mc.map((c) => c.cardId))], capUsage: r.capUsage || null, myCards: mc, isPremium: !!r.isPremium });
    });
  });
}

let lastSignature = null; // dohraav rokne ke liye (SPA re-eval)
let frameOffers = [];     // payment-iframe (apx) se postMessage se aaye card-offers

// i18n helper — CardWizI18n.t() + {var} interpolation. Falls back to key if i18n missing.
function T(key, vars) {
  const i18n = (typeof window !== 'undefined') && window.CardWizI18n;
  let s = (i18n && i18n.t) ? i18n.t(key) : key;
  if (vars) for (const k in vars) s = s.split('{' + k + '}').join(String(vars[k]));
  return s;
}

// Rupee/percent display: round to 2 decimals, drop trailing .00 (no float noise like 32.6500006).
function money(n) {
  const r = Math.round((Number(n) || 0) * 100) / 100;
  return Number.isInteger(r) ? String(r) : r.toFixed(2);
}

// 🔧 TODO(PUBLISH): publish se pehle false karo. Merchant page ke DevTools Console me
// "[CardWiz]" filter karke amount/offer detection ka pura trace dikhta hai.
const CW_DEBUG = true;
const CW_BUILD = 'l4-v5'; // console me dikhega — isse pata chalega kaunsa build chal raha hai
function dbg(...args) {
  if (!CW_DEBUG) return;
  const tag = (typeof window !== 'undefined' && window.top !== window) ? 'frame' : 'widget';
  const D = (typeof globalThis !== 'undefined') && globalThis.CardWizDebug;
  if (D && D.cwlog) return D.cwlog(tag, ...args);
  try { console.log('[CardWiz] [' + tag + ']', ...args); } catch (_) { /* noop */ }
}

async function evaluateAndRender() {
  const site = detectSite(location.hostname);
  if (!site) return;
  if (!isCheckoutish(location.pathname + location.search)) {
    removeWidget();
    return;
  }
  // User ne is page pe widget close kiya tha? to mat dikhao.
  if (sessionStorage.getItem('scs-dismissed') === location.pathname) return;

  const DB = await window.CardWizCatalog.load();
  const { owned, capUsage, myCards, isPremium } = await getWalletState();
  const amount = detectAmount(site.merchant);
  const hasAmt = amount && amount > 0;

  const baseOpts = { category: site.category, amount: amount || 0 };
  // Phase 5: widget bhi caps respect kare (read-only — sirf warn karta hai, log nahi).
  if (window.CardWizCapTracker) {
    baseOpts.getRemaining = window.CardWizCapTracker.makeGetRemaining(capUsage, new Date());
  }

  // ── "Your cards" — owned cards, CARD-SPECIFIC page offers factored in ──
  const offerTexts = readOffersFromDOM();
  const offersByBank = window.CardWizOffers.bestOffersByBank(offerTexts, amount || 0);
  // Har card ka apna instant offer: is frame se + payment-iframe se aaye hue (Amazon ka
  // naya checkout card list ko apx secure IFRAME me rakhta hai — wahan ka scan
  // postMessage se frameOffers me aata hai).
  const cardOffers = readAllFramesCardOffers().concat(frameOffers);
  dbg('site:', site.merchant, '| amount:', amount, '| owned:', owned.length, '| premium:', isPremium);
  dbg('page card-offers:', cardOffers.map((o) => `₹${o.amt} @ "${o.ctx.slice(0, 70)}…"`));
  // Bank-wide parsed offers (fallback ka raw material) — kahan se kya parse hua, sab dikhe.
  const bwList = Object.entries(offersByBank).map(([b, m2]) => `${b}: ₹${m2.value} raw:"${String((m2.offer && m2.offer.raw) || '').slice(0, 55)}"`);
  if (bwList.length) dbg('bank-wide parsed:', bwList);
  let ownedRanked = [];
  if (owned.length) {
    // Wallet me kis-kis card ka last4 saved hai — matching ka raw material.
    const walletL4 = (myCards || [])
      .filter((c) => String(c.last4 || '').replace(/\D/g, '').length === 4)
      .map((c) => `${c.cardId}:${String(c.last4).replace(/\D/g, '')}`);
    dbg('wallet last4 entries (' + walletL4.length + '):', walletL4.slice(0, 15).join(', ') || 'KOI NAHI — isliye generic rows match nahi ho sakte');

    const claimed = new Set();
    ownedRanked = window.CardWizEngine.recommend(DB, { ...baseOpts, ownedCardIds: owned });
    ownedRanked.forEach((r) => {
      // Is card ke wallet entries ke saved last4 (ek card ke multiple entries ho sakte).
      const l4s = (myCards || [])
        .filter((c) => c.cardId === r.id)
        .map((c) => String(c.last4 || '').replace(/\D/g, ''))
        .filter((s) => s.length === 4);
      let off = matchCardOffer(r.name, r.bank, l4s, cardOffers, claimed); // sirf isi card ka offer (bank verified)
      // Fallback SIRF cart-style pages ke liye (jahan card-specific rows hoti hi nahi).
      // Payment page (cardOffers.length > 0) pe page-wide sale banners ("Save upto ₹5500")
      // kisi card pe nahi lagne chahiye — har card ka apna row-offer hi sach hai.
      if (!off && cardOffers.length === 0) {
        const m = offersByBank[r.bank];
        if (m && m.value > 0) {
          off = m.value;
          dbg('offer via bank-wide (page offer):', r.bank, '→ ₹' + off, '|', String((m.offer && m.offer.raw) || '').slice(0, 60));
        }
      }
      r.offerValue = off > 0 ? Math.min(off, amount || off) : 0;
      r.total = r.savings + r.offerValue;
    });
    ownedRanked.sort((a, b) => (b.total - a.total) || (b.rate - a.rate));
    // Har render ka top-5 (reward + offer breakdown) — ranking flicker pakadne ke liye.
    dbg('top5:', ownedRanked.slice(0, 5).map((r) => `${r.name} = ₹${money(r.savings)} + off₹${money(r.offerValue)}`));
    // Jo page-offers kisi wallet card se attach NAHI hue — exact reason ke saath.
    cardOffers.forEach((o) => {
      if (!claimed.has(o)) {
        const digits = ctxLast4s(o.ctx).join('/') || '?';
        dbg(`⚠️ UNCLAIMED offer ₹${o.amt} (ending ${digits}) — wallet me is last4 wala card nahi/last4 missing. ctx: "${o.ctx.slice(0, 70)}"`);
      }
    });
  }

  // ── "All cards" — full catalog minus owned, ranked by reward (upsell tab) ──
  const ownedSet = new Set(owned);
  const notOwned = window.CardWizEngine.recommend(DB, baseOpts)
    .filter((r) => !ownedSet.has(r.id) && (r.savings > 0 || !hasAmt))
    .slice(0, 25);

  // Jo offers kisi owned card se match nahi hue — info ke liye.
  const matchedBanks = new Set(ownedRanked.map((r) => r.bank));
  const otherOffers = Object.values(offersByBank)
    .filter((m) => !matchedBanks.has(m.offer.bank))
    .map((m) => m.offer.bank);

  // Same state pe baar-baar re-render mat karo.
  const sig = `${site.category}|${amount}|${owned.length}|${isPremium}|${ownedRanked[0] && ownedRanked[0].id}|${ownedRanked[0] && ownedRanked[0].total}|${notOwned[0] && notOwned[0].id}|${offerTexts.length}|${cardOffers.length}`;
  if (sig === lastSignature) return;
  lastSignature = sig;

  renderWidget(site, amount, ownedRanked, otherOffers, myCards, notOwned, isPremium);
}

// ---------- Shadow-DOM Widget ----------

function removeWidget() {
  const host = document.getElementById(WIDGET_HOST_ID);
  if (host) host.remove();
}

// ── Widget dragging (module-level: listeners EK hi baar lagte hain, har render pe nahi) ──
let cwDragState = null;
let cwDragInstalled = false;

// Widget ko viewport ke andar clamp karke left/top pe rakho (bottom/right hatao).
function applyWidgetPos(host, x, y) {
  const cx = Math.max(4, Math.min(x, window.innerWidth - 120));
  const cy = Math.max(4, Math.min(y, window.innerHeight - 60));
  host.style.left = cx + 'px';
  host.style.top = cy + 'px';
  host.style.right = 'auto';
  host.style.bottom = 'auto';
}

function installDragListeners() {
  if (cwDragInstalled) return;
  cwDragInstalled = true;
  document.addEventListener('mousemove', (e) => {
    if (!cwDragState) return;
    const host = document.getElementById(WIDGET_HOST_ID);
    if (!host) { cwDragState = null; return; }
    applyWidgetPos(host, e.clientX - cwDragState.dx, e.clientY - cwDragState.dy);
  }, true);
  document.addEventListener('mouseup', () => {
    if (!cwDragState) return;
    cwDragState = null;
    const host = document.getElementById(WIDGET_HOST_ID);
    if (host) {
      const rect = host.getBoundingClientRect();
      try { sessionStorage.setItem('cw-widget-pos', JSON.stringify({ x: rect.left, y: rect.top })); } catch (_) { /* noop */ }
    }
  }, true);
}

function renderWidget(site, amount, ownedRanked, otherOffers, myCards, notOwned, isPremium) {
  removeWidget();

  const host = document.createElement('div');
  host.id = WIDGET_HOST_ID;
  host.style.cssText = 'position:fixed;bottom:20px;right:20px;z-index:2147483647;';
  const shadow = host.attachShadow({ mode: 'open' });

  const hasAmount = amount && amount > 0;

  // Ek card row — dono tabs (owned / all) isi se. blur = reward chhupa (premium gate);
  // apply = not-owned card pe Apply button.
  function buildRow(r, i, list, blur, apply) {
    const star = i === 0 ? '⭐ ' : '';
    const isCash = r.type === 'cashback';
    const typeLabel = isCash ? T('cw_type_cashback') : r.type === 'miles' ? T('cw_type_miles') : T('cw_type_points');
    const typeClass = isCash ? 'tag-cash' : r.type === 'miles' ? 'tag-miles' : 'tag-pts';
    const approx = isCash ? '' : '≈';
    const bl = blur ? ' blurred' : '';
    // Instant-off flat hota hai — order total pe depend nahi karta, isliye DONO modes
    // (amount / no-amount) me dikhao. (Pehle sirf amount-mode me tha — totals late load
    // hone par offer kabhi dikhta hi nahi tha.)
    const offerLine = (r.offerValue || 0) > 0 ? `<span class="offer">+₹${money(r.offerValue)} ${T('cw_instant_off')}</span>` : '';
    let right;
    if (hasAmount) {
      const rewardRow = `<span class="rewardrow"><span class="reward${bl}">${approx}₹${money(r.savings)}</span><span class="pill ${typeClass}">${typeLabel}</span></span>`;
      const capLine = r.capExhausted ? `<span class="capnote khatam">${T('pop_cap_khatam')}</span>`
                    : (r.capped ? `<span class="capnote">${T('cw_cap_tak')}</span>` : '');
      const diff = (!blur && i === 0 && list.length > 1) ? r.savings - list[1].savings : 0;
      const whyLine = diff > 0 ? `<span class="whydiff">+₹${money(diff)} ${T('cw_vs_next')}</span>` : '';
      right = rewardRow + offerLine + capLine + whyLine;
    } else {
      right = `<span class="rewardrow"><span class="reward${bl}">${money(r.rate)}%</span><span class="pill ${typeClass}">${typeLabel}</span></span>` + offerLine;
    }
    let subtitle = '';
    const walletEntry = myCards && myCards.find((c) => c.cardId === r.id);
    if (walletEntry) {
      const endingPart = walletEntry.last4 ? T('cw_ending', { n: walletEntry.last4 }) : '';
      if (walletEntry.nickname && endingPart) subtitle = `${walletEntry.nickname} - ${endingPart}`;
      else if (walletEntry.nickname) subtitle = walletEntry.nickname;
      else subtitle = endingPart;
    }
    let applyHtml = '';
    if (apply && window.CardWizAffiliate) {
      const url = window.CardWizAffiliate.bankApplyUrl(r.bank);
      if (url) applyHtml = `<a class="apply" data-url="${escapeHtml(url)}">${T('cw_apply')}</a>`;
    }
    return `<div class="row ${i === 0 ? 'best' : ''} ${r.capExhausted ? 'exhausted' : ''}">
        <div class="cleft"><span class="cname">${star}${escapeHtml(r.name)}</span>${subtitle ? `<span class="csub">${escapeHtml(subtitle)}</span>` : ''}</div>
        <span class="csave">${right}${applyHtml}</span>
      </div>`;
  }

  const shownOwned = ownedRanked.filter((r) => r.total > 0 || !hasAmount);
  const ownedHtml = shownOwned.length
    ? shownOwned.map((r, i) => buildRow(r, i, shownOwned, false, false)).join('')
    : `<div class="cwempty">${T('cw_owned_empty')}</div>`;
  const allHtml = notOwned.length
    ? notOwned.map((r, i) => buildRow(r, i, notOwned, !isPremium, true)).join('')
    : `<div class="cwempty">${T('cw_all_empty')}</div>`;

  const headline = hasAmount
    ? T('cw_headline_amount', { amt: amount, merchant: site.merchant })
    : T('cw_headline_noamount', { merchant: site.merchant });

  const upgradeHtml = (!isPremium && notOwned.length)
    ? `<button class="upgrade">${T('cw_unlock')}</button>` : '';

  // Jo offers kisi DB-card se match nahi (Kotak etc.) — chhoti info line.
  const otherOffersHtml = (otherOffers && otherOffers.length)
    ? `<div class="offers">💡 ${T('cw_more_offers')}: ${escapeHtml(otherOffers.join(', '))}</div>`
    : '';

  // Phase 6: affiliate "Buy via our link" (no extra cost) + disclosure.
  const aff = window.CardWizAffiliate
    ? window.CardWizAffiliate.affiliateUrl(site.category, location.href)
    : { affiliated: false };
  const affHtml = aff.affiliated
    ? `<button class="buy" data-url="${escapeHtml(aff.url)}">${T('cw_buy_link')}</button>
       <div class="disc">${T('cw_disclosure')} <b>${T('cw_donate')}</b></div>`
    : '';

  shadow.innerHTML = `
    <style>
      :host { all: initial; }
      @keyframes cwSlideIn { from { opacity: 0; transform: translateY(10px) scale(.98); } to { opacity: 1; transform: none; } }
      .box {
        font-family: 'Segoe UI', system-ui, sans-serif;
        width: 280px; background: #0C1018; color: #E8ECF4;
        border: 1px solid #2A3450; border-radius: 14px; padding: 14px;
        box-shadow: 0 8px 30px rgba(0,0,0,.45);
        animation: cwSlideIn .26s cubic-bezier(.16, 1, .3, 1) both;
      }
      .hd { display:flex; justify-content:space-between; align-items:center; margin-bottom:8px; }
      .title { font-size:13px; font-weight:700; color:#6366F1; }
      .x { cursor:pointer; color:#8A93AC; font-size:14px; line-height:1; background:none; border:none; padding:2px 4px; }
      .x:hover { color:#FB7185; }
      .headline { font-size:11px; color:#B7C0D4; margin-bottom:8px; }
      .cwlist { max-height:264px; overflow-y:auto; margin:0 -2px; padding:0 2px; }
      .cwlist::-webkit-scrollbar { width:6px; }
      .cwlist::-webkit-scrollbar-thumb { background:#2A3450; border-radius:3px; }
      .cwlist::-webkit-scrollbar-track { background:transparent; }
      .row { display:flex; justify-content:space-between; align-items:center;
             background:#222C42; border:1px solid #2A3450; border-radius:8px;
             padding:8px 10px; margin-bottom:6px; gap:8px; }
      .row.best { border-color:#34D399; background:#123528; }
      .row.exhausted { border-color:#FB7185; opacity:.85; }
      .cleft { display:flex; flex-direction:column; min-width:0; }
      .cname { font-size:11px; font-weight:600; }
      .csub { font-size:9px; color:#8A93AC; margin-top:2px; }
      .csave { display:flex; flex-direction:column; align-items:flex-end; gap:5px; white-space:nowrap; flex-shrink:0; }
      .csave .rewardrow { display:flex; align-items:center; gap:6px; }
      .csave .reward { font-size:14px; font-weight:800; color:#34D399; line-height:1; }
      .csave .offer { font-size:11px; font-weight:800; color:#0C1018; background:#818CF8;
                      padding:2px 7px; border-radius:5px; line-height:1.3; }
      .csave .capnote { font-size:8px; background:#FBBF24; color:#0C1018; padding:2px 7px; border-radius:4px; font-weight:700; line-height:1.3; }
      .csave .capnote.khatam { background:#FB7185; }
      .csave .pill { font-size:8px; padding:2px 7px; border-radius:4px; font-weight:700; letter-spacing:.2px; line-height:1.3; }
      .tag-cash { background:#34D399; color:#0C1018; }
      .tag-pts  { background:#818CF8; color:#0C1018; }
      .tag-miles { background:#FBBF24; color:#0C1018; }
      .whydiff { font-size:8px; font-weight:700; color:#34D399; margin-top:2px; display:block; }
      .offers { font-size:9px; color:#818CF8; margin-top:2px; line-height:1.4; }
      .buy {
        width:100%; margin-top:8px; background:#FBBF24; color:#0C1018; border:none;
        border-radius:8px; padding:8px; font-size:11px; font-weight:700; cursor:pointer;
      }
      .buy:hover { background:#FCD34D; }
      .disc { font-size:8px; color:#8A93AC; margin-top:3px; line-height:1.4; }
      .ft { font-size:9px; color:#8A93AC; margin-top:6px; line-height:1.4; }
      .ft b { color:#B7C0D4; }
      .csave .reward, .csave .offer, .whydiff, .pill { font-variant-numeric: tabular-nums; }
      .tabs { display:flex; gap:4px; margin-bottom:8px; background:#161C2D; border:1px solid #2A3450; border-radius:9px; padding:3px; }
      .tab { flex:1; background:none; border:none; color:#8A93AC; font-size:10px; font-weight:700; padding:6px 4px; border-radius:6px; cursor:pointer; font-family:inherit; }
      .tab.active { background:#6366F1; color:#fff; }
      .reward.blurred { filter:blur(5px); -webkit-filter:blur(5px); user-select:none; }
      .apply { display:inline-block; margin-top:5px; background:#6366F1; color:#fff; font-size:9px; font-weight:700; padding:3px 9px; border-radius:5px; cursor:pointer; text-decoration:none; }
      .apply:hover { background:#818CF8; }
      .upgrade { width:100%; margin-bottom:8px; background:linear-gradient(90deg,#6366F1,#818CF8); color:#fff; border:none; border-radius:8px; padding:8px; font-size:10px; font-weight:800; cursor:pointer; font-family:inherit; }
      .cwempty { font-size:10px; color:#8A93AC; text-align:center; padding:18px 8px; }
      @media (prefers-reduced-motion: reduce) { .box { animation: none !important; } }
    </style>
    <div class="box">
      <div class="hd">
        <span class="title">💳 CardWiz</span>
        <button class="x" title="${T('cw_close')}">✕</button>
      </div>
      <div class="headline">${escapeHtml(headline)}</div>
      <div class="tabs">
        <button class="tab active" data-tab="owned">${T('cw_tab_your')} (${shownOwned.length})</button>
        <button class="tab" data-tab="all">${T('cw_tab_all')}</button>
      </div>
      <div class="cwlist" data-list="owned">${ownedHtml}</div>
      <div class="cwlist" data-list="all" hidden>${upgradeHtml}${allHtml}</div>
      ${otherOffersHtml}
      ${affHtml}
      <div class="ft">${T('cw_ft_approx')}<br>${T('cw_ft_readonly')}</div>
    </div>
  `;

  shadow.querySelector('.x').addEventListener('click', () => {
    sessionStorage.setItem('scs-dismissed', location.pathname);
    removeWidget();
  });

  // ── Drag: header pakad ke widget kahin bhi move karo (peeche ke buttons ke liye
  // jagah banane ke liye). Position is tab-session me yaad rehti hai — re-render pe bhi.
  const hd = shadow.querySelector('.hd');
  hd.style.cursor = 'grab';
  hd.title = '↔ Drag karke move karo';
  const savedPos = (() => {
    try { return JSON.parse(sessionStorage.getItem('cw-widget-pos') || 'null'); } catch (_) { return null; }
  })();
  if (savedPos && typeof savedPos.x === 'number') applyWidgetPos(host, savedPos.x, savedPos.y);
  hd.addEventListener('mousedown', (e) => {
    if (e.target && e.target.classList && e.target.classList.contains('x')) return; // close button
    const rect = host.getBoundingClientRect();
    cwDragState = { dx: e.clientX - rect.left, dy: e.clientY - rect.top };
    hd.style.cursor = 'grabbing';
    e.preventDefault();
  });
  installDragListeners();
  const buyBtn = shadow.querySelector('.buy');
  if (buyBtn) buyBtn.addEventListener('click', () => window.open(buyBtn.dataset.url, '_blank', 'noopener'));

  // Tab switch: Your cards <-> All cards
  const tabs = shadow.querySelectorAll('.tab');
  const lists = shadow.querySelectorAll('.cwlist');
  tabs.forEach((tab) => tab.addEventListener('click', () => {
    tabs.forEach((x) => x.classList.toggle('active', x === tab));
    lists.forEach((l) => { l.hidden = (l.dataset.list !== tab.dataset.tab); });
  }));

  // Apply buttons (not-owned cards) → bank apply page
  shadow.querySelectorAll('.apply').forEach((a) =>
    a.addEventListener('click', (e) => { e.preventDefault(); window.open(a.dataset.url, '_blank', 'noopener'); }));

  // Upgrade → pricing
  const up = shadow.querySelector('.upgrade');
  if (up) up.addEventListener('click', () => window.open('https://cardwiz.in/pricing', '_blank', 'noopener'));

  document.body.appendChild(host);
}

function escapeHtml(s) {
  return String(s).replace(/[&<>"']/g, (c) =>
    ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
}

// ---------- Init + SPA navigation handling ----------

function init() {
  // Har frame me load-proof — isse pata chalta hai script payment iframe me inject
  // hua ya nahi (sabse pehla debugging clue).
  dbg('build', CW_BUILD, '| loaded in', window.top === window ? 'TOP frame' : 'CHILD frame', '|', String(location.href).slice(0, 110));

  // ── FRAME MODE ── Amazon ka naya checkout payment-cards ko secure iframe (apx) me
  // rakhta hai. Frames me widget NAHI banate — sirf card-offers scan karke top frame
  // ko postMessage bhejte hain.
  if (window.top !== window) {
    // NOTE: yahan detectSite check NAHI — srcdoc/blob frames ka hostname empty/alag ho
    // sakta hai; manifest match ne already yeh merchant tab hi limit kar diya hai.
    let sent = '';
    const scanAndSend = () => {
      const offers = readPaymentCardOffers();
      if (!offers.length) return;
      const key = JSON.stringify(offers);
      if (key === sent) return; // same data dobara mat bhejo
      sent = key;
      dbg('FRAME → TOP bhej raha:', offers.length, 'offers');
      try { window.top.postMessage({ type: 'cardwiz-card-offers', offers }, '*'); } catch (_) { /* noop */ }
    };
    let ft = 0;
    const floop = () => { scanAndSend(); if (++ft < 20) setTimeout(floop, 1500); };
    setTimeout(floop, 800);
    if (typeof MutationObserver !== 'undefined' && document.body) {
      let fdeb = null;
      new MutationObserver(() => {
        if (fdeb) return;
        fdeb = setTimeout(() => { fdeb = null; scanAndSend(); }, 800);
      }).observe(document.body, { childList: true, subtree: true });
    }
    return;
  }

  // ── TOP FRAME ── iframe se aaye card-offers receive karo.
  window.addEventListener('message', (e) => {
    const d = e.data;
    if (!d || d.type !== 'cardwiz-card-offers' || !Array.isArray(d.offers)) return;
    let fromMerchant = false;
    if (e.origin === 'null') fromMerchant = true; // sandboxed/srcdoc secure frame (origin "null")
    else try { fromMerchant = !!detectSite(new URL(e.origin).hostname); } catch (_) { /* ignore */ }
    if (!fromMerchant) { dbg('frame-message reject (origin):', e.origin); return; }
    dbg('TOP ← FRAME message:', d.offers.length, 'offers | origin:', e.origin);
    const clean = d.offers
      .filter((o) => o && typeof o.amt === 'number' && o.amt > 0 && o.amt <= 100000 && typeof o.ctx === 'string')
      .map((o) => ({ amt: o.amt, ctx: String(o.ctx).slice(0, 600).toLowerCase() }))
      .slice(0, 20);
    if (!clean.length) return;
    if (JSON.stringify(clean) === JSON.stringify(frameOffers)) return; // no change
    frameOffers = clean;
    dbg('iframe se card-offers mile:', clean.map((o) => '₹' + o.amt));
    lastSignature = null;
    evaluateAndRender().catch(() => {});
  });

  // Pehli baar: thoda delay (checkout totals async load hote hain), phir retries.
  let tries = 0;
  const retry = () => {
    evaluateAndRender().catch(() => {});
    if (++tries < 5) setTimeout(retry, 1200);
  };
  // User ki selected language (chrome.storage 'cwLang') pehle load karo, phir render.
  const start = () => setTimeout(retry, 600);
  if (window.CardWizI18n && window.CardWizI18n.loadLang) {
    window.CardWizI18n.loadLang().then(start, start);
  } else {
    start();
  }

  // Popup mein language / wallet / premium change ho to widget bhi turant re-render ho.
  if (typeof chrome !== 'undefined' && chrome.storage && chrome.storage.onChanged) {
    chrome.storage.onChanged.addListener((changes, area) => {
      if (area !== 'local') return;
      if (changes.cwLang && window.CardWizI18n) window.CardWizI18n.setLangValue(changes.cwLang.newValue || 'en');
      if (changes.cwLang || changes.myCards || changes.isPremium) {
        lastSignature = null; // force re-render
        evaluateAndRender().catch(() => {});
      }
    });
  }

  // SPA (Flipkart/Myntra) URL change pe re-evaluate.
  let lastPath = location.pathname + location.search;
  const onNav = () => {
    const now = location.pathname + location.search;
    if (now !== lastPath) {
      lastPath = now;
      lastSignature = null;
      tries = 0;
      setTimeout(retry, 600);
    }
  };
  // history API patch + popstate
  ['pushState', 'replaceState'].forEach((fn) => {
    const orig = history[fn];
    history[fn] = function () { const r = orig.apply(this, arguments); onNav(); return r; };
  });
  window.addEventListener('popstate', onNav);
  setInterval(onNav, 1500); // fallback for sites that bypass history API

  // Reload/late-load robustness: checkout totals + DOM often render after our retries
  // finish, and some SPAs wipe the body on hydration (widget disappears & never returns).
  // A debounced observer re-renders whenever a checkout page's DOM changes.
  if (typeof MutationObserver !== 'undefined' && document.body) {
    let debounce = null;
    const obs = new MutationObserver(() => {
      if (debounce || !isCheckoutish(location.pathname + location.search)) return;
      debounce = setTimeout(() => {
        debounce = null;
        evaluateAndRender().catch(() => {});
      }, 1000);
    });
    obs.observe(document.body, { childList: true, subtree: true });
  }
}

// Browser mein hi init chalao; Node test mein nahi.
if (typeof document !== 'undefined' && typeof window !== 'undefined') {
  init();
}

// Node testing ke liye pure helpers export.
if (typeof module !== 'undefined' && module.exports) {
  module.exports = { detectSite, isCheckoutish, parseRupee, matchCardOffer };
}
