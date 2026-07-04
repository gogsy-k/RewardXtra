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

const BANK_NAME_RE = /(hdfc|icici|sbi|axis|kotak|amex|american express|indusind|yes bank|rbl|idfc|federal|standard chartered|hsbc|au bank|bob|bank of baroda|citibank|onecard)/i;

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
function readPaymentCardOffers() {
  const out = [];
  const leaves = document.querySelectorAll('div, li, p, span, td, b, strong');
  for (const node of leaves) {
    if (node.children.length > 3) continue;
    const own = (node.textContent || '').replace(/\s+/g, ' ').trim();
    if (own.length < 6 || own.length > 220) continue;
    const m = own.match(/(?:₹|rs\.?|inr)\s*([\d,]+(?:\.\d+)?)\s*(?:off|discount)\b/i);
    if (!m) continue;
    const amt = parseFloat(m[1].replace(/,/g, ''));
    if (!amt || amt <= 0 || amt > 100000) continue;
    // Card-row container dhoondo (jisme card ka naam ho).
    let el = node, ctx = '';
    for (let i = 0; i < 8 && el.parentElement; i++) {
      el = el.parentElement;
      const at = (el.textContent || '').replace(/\s+/g, ' ');
      if (BANK_NAME_RE.test(at) && at.length < 400) { ctx = at.toLowerCase(); break; }
    }
    if (ctx) out.push({ amt, ctx });
  }
  return out;
}

// Bank + generic words — card ke distinctive product tokens nikaalne ke liye hataao.
const OFFER_GENERIC_WORDS = new Set([
  'bank', 'credit', 'debit', 'card', 'cards', 'the', 'of', 'and', 'private', 'metal', 'signature',
  'platinum', 'plus', 'pro', 'select', 'prime', 'gold', 'classic', 'rupay', 'visa', 'mastercard',
  'icici', 'hdfc', 'sbi', 'axis', 'kotak', 'rbl', 'indusind', 'yes', 'idfc', 'hsbc', 'amex',
  'american', 'express', 'federal', 'dbs', 'baroda', 'standard', 'chartered', 'citi', 'onecard', 'first',
]);

// Card ko uske apne page-offer se match karo (naam ke distinctive tokens se). No match -> 0.
function matchCardOffer(cardName, cardOffers) {
  if (!cardOffers || !cardOffers.length) return 0;
  const tokens = String(cardName).toLowerCase().replace(/[^a-z0-9 ]/g, ' ').split(/\s+/)
    .filter((t) => t.length > 2 && !OFFER_GENERIC_WORDS.has(t));
  if (!tokens.length) return 0; // koi distinctive token nahi -> safe: no offer (over-credit se bacho)
  const matches = cardOffers.filter((o) => tokens.every((t) => o.ctx.includes(t)));
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
  const cardOffers = readPaymentCardOffers(); // har card ka apna instant offer (bank-level nahi)
  let ownedRanked = [];
  if (owned.length) {
    ownedRanked = window.CardWizEngine.recommend(DB, { ...baseOpts, ownedCardIds: owned });
    ownedRanked.forEach((r) => {
      const off = matchCardOffer(r.name, cardOffers); // sirf isi card ka offer
      r.offerValue = off > 0 ? Math.min(off, amount || off) : 0;
      r.total = r.savings + r.offerValue;
    });
    ownedRanked.sort((a, b) => (b.total - a.total) || (b.rate - a.rate));
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
  const sig = `${site.category}|${amount}|${owned.length}|${isPremium}|${ownedRanked[0] && ownedRanked[0].id}|${ownedRanked[0] && ownedRanked[0].total}|${notOwned[0] && notOwned[0].id}|${offerTexts.length}`;
  if (sig === lastSignature) return;
  lastSignature = sig;

  renderWidget(site, amount, ownedRanked, otherOffers, myCards, notOwned, isPremium);
}

// ---------- Shadow-DOM Widget ----------

function removeWidget() {
  const host = document.getElementById(WIDGET_HOST_ID);
  if (host) host.remove();
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
    let right;
    if (hasAmount) {
      const rewardRow = `<span class="rewardrow"><span class="reward${bl}">${approx}₹${money(r.savings)}</span><span class="pill ${typeClass}">${typeLabel}</span></span>`;
      const offerLine = (r.offerValue > 0) ? `<span class="offer">+₹${money(r.offerValue)} ${T('cw_instant_off')}</span>` : '';
      const capLine = r.capExhausted ? `<span class="capnote khatam">${T('pop_cap_khatam')}</span>`
                    : (r.capped ? `<span class="capnote">${T('cw_cap_tak')}</span>` : '');
      const diff = (!blur && i === 0 && list.length > 1) ? r.savings - list[1].savings : 0;
      const whyLine = diff > 0 ? `<span class="whydiff">+₹${money(diff)} ${T('cw_vs_next')}</span>` : '';
      right = rewardRow + offerLine + capLine + whyLine;
    } else {
      right = `<span class="rewardrow"><span class="reward${bl}">${money(r.rate)}%</span><span class="pill ${typeClass}">${typeLabel}</span></span>`;
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
  module.exports = { detectSite, isCheckoutish, parseRupee };
}
