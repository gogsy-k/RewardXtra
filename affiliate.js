/*
 * CardWiz — Affiliate Link Builder (Phase 6)
 * --------------------------------------------------
 * Merchant + page URL -> affiliate-tagged URL. Free tier ka revenue source.
 *
 * IMPORTANT (transparency): har affiliate link ke saath disclosure dikhana ZAROORI hai
 * (Chrome Web Store policy + user trust): "Hum chhota commission kamaate hain, aapko
 * koi extra cost nahi." User ke liye price same rehta hai.
 *
 * Pure logic, koi DOM nahi — Node mein testable.
 *
 * ⚠️ Neeche ke IDs PLACEHOLDER hain. Networks pe sign-up karke real IDs daalo:
 *    - Amazon Associates: https://affiliate-program.amazon.in
 *    - Flipkart Affiliate / via Cuelinks/INRDeals (India)
 */

const DEFAULT_AFFILIATE_CONFIG = {
  amazon: { tag: 'gogsy-21' },               // Amazon Associates — direct (best rate)
  flipkart: { affid: '' },                   // empty → routes through INRDeals below
  // Universal wrapper for every non-Amazon merchant (Flipkart, Myntra, Ajio, Nykaa,
  // Swiggy, Zomato, grocery, MakeMyTrip, etc.). INRDeals = raw-append deeplink.
  inrdeals: { username: 'gur478927530', enabled: true },
  cuelinks: { cid: '', enabled: false },     // alt wrapper (kept as fallback)
};

const DISCLOSURE =
  '💡 Hum affiliate link se chhota commission kamaate hain — aapko koi extra cost nahi. We donate 50% of affiliate earnings.';

// URL pe ek query param safely set karo (existing params todhe bina).
function setParam(url, key, value) {
  try {
    const u = new URL(url);
    u.searchParams.set(key, value);
    return u.toString();
  } catch (_) {
    return url; // invalid URL -> jaisa hai waisa
  }
}

function amazonLink(url, tag) {
  return tag ? setParam(url, 'tag', tag) : url;
}

function flipkartLink(url, affid) {
  return affid ? setParam(url, 'affid', affid) : url;
}

// Universal network (Cuelinks) — destination URL ko wrap karta hai.
function cuelinksLink(url, cid) {
  if (!cid) return url;
  return `https://linksredirect.com/?cid=${encodeURIComponent(cid)}&source=linkkit&url=${encodeURIComponent(url)}`;
}

// INRDeals on-the-fly deeplink — RAW append (no encoding): inrdeals.com/<user>/<full url>.
function inrdealsLink(url, username) {
  if (!username) return url;
  return `https://inrdeals.com/${username}/${url}`;
}

// INRDeals CPA apply links (publisher gur478927530) — the ONLY banks/cards we actually EARN on.
// Cards NOT listed here show NO "Apply" button (koi free bank-page fallback nahi — jahan paisa
// nahi milta wahan Apply dikhane ka fayda nahi). Mirrors website lib/affiliate.ts. (2026-07-05)
const INR_PUB = 'gur478927530';
function inrApply(url, campaign) {
  return 'https://inr.deals/redirect?id=' + INR_PUB + '&src=cardwiz&url=' + url + '&campaign=' + campaign;
}

// Card-specific (override bank-level) — keyed by catalog card id.
const CARD_APPLY_AFFILIATE = {
  'sbi-simplyclick': inrApply('https://www.sbicard.com', 'cpa_lead'),
  'sbi-cashback': inrApply('https://www.sbicard.com', 'cpa_cb'),
  'scapia-federal': inrApply('https://apply.scapia.cards/', 'cpa'),
  'jupiter-edge-csb': inrApply('https://web.jupiter.money/rupay-csb/web-ob/landing', 'cpa'),
};
// Bank-level — every card of the bank earns on apply.
const BANK_APPLY_AFFILIATE = {
  'HDFC': inrApply('https://applyonline.hdfcbank.com/cards/credit-cards.html', 'cpl'),
  'Axis': inrApply('https://web.axis.bank.in/DigitalChannel/WebForm/', 'cpl'),
  'SBI': inrApply('https://www.sbicard.com', 'cpa_lead'),
  'AU Small Finance Bank': inrApply('https://cconboarding.aubank.in/auccself/#/landing', 'cpa'),
  'Federal Bank': inrApply('https://creditcards.federalbank.co.in', 'cpa'),
  'IDFC FIRST': inrApply('https://www.idfcfirstbank.com/credit-card/ntb-diy/apply', 'cpa'),
  'IndusInd': inrApply('https://induseasycredit.indusind.bank.in/', 'cpa'),
  'HSBC': inrApply('https://www.accountopening.hsbc.co.in/credit-cards/', 'cpa'),
  'Bank of Baroda': inrApply('https://mycard.bobcard.tech/splash-screen', 'cpl'),
  'Yes Bank': inrApply('https://applyonline.getpopcard.co/', 'cpl'), // only Yes CPA (POP co-brand)
};

// Apply URL for a card — ONLY when we EARN (INRDeals CPA link exists). Else null → no Apply button.
function cardApplyUrl(bank, cardId) {
  if (cardId && CARD_APPLY_AFFILIATE[cardId]) return CARD_APPLY_AFFILIATE[cardId];
  if (BANK_APPLY_AFFILIATE[bank]) return BANK_APPLY_AFFILIATE[bank];
  return null;
}

/**
 * Affiliated URL banao.
 * @param {string} merchant - 'amazon' | 'flipkart' | 'myntra' | ...
 * @param {string} url      - current page/product URL
 * @param {object} [config] - affiliate IDs (DEFAULT_AFFILIATE_CONFIG)
 * @returns {{url:string, affiliated:boolean, network:string|null, disclosure:string}}
 */
function affiliateUrl(merchant, url, config) {
  const cfg = config || DEFAULT_AFFILIATE_CONFIG;
  if (!url) return { url, affiliated: false, network: null, disclosure: DISCLOSURE };

  let out = url, network = null;
  if (merchant === 'amazon' && cfg.amazon && cfg.amazon.tag) {
    out = amazonLink(url, cfg.amazon.tag); network = 'Amazon Associates';
  } else if (merchant === 'flipkart' && cfg.flipkart && cfg.flipkart.affid) {
    out = flipkartLink(url, cfg.flipkart.affid); network = 'Flipkart Affiliate';
  } else if (cfg.inrdeals && cfg.inrdeals.enabled && cfg.inrdeals.username) {
    // Flipkart + Myntra + koi bhi aur merchant -> INRDeals universal wrapper.
    out = inrdealsLink(url, cfg.inrdeals.username); network = 'INRDeals';
  } else if (cfg.cuelinks && cfg.cuelinks.enabled && cfg.cuelinks.cid) {
    out = cuelinksLink(url, cfg.cuelinks.cid); network = 'Cuelinks';
  }

  return { url: out, affiliated: out !== url, network, disclosure: DISCLOSURE };
}

// ---------- Exports (browser/worker/node) ----------
// unique const naam — classic scripts shared global scope mein collide na ho.
const affiliateApi = { DEFAULT_AFFILIATE_CONFIG, DISCLOSURE, affiliateUrl, amazonLink, flipkartLink, cuelinksLink, inrdealsLink, cardApplyUrl, CARD_APPLY_AFFILIATE, BANK_APPLY_AFFILIATE };
if (typeof module !== 'undefined' && module.exports) module.exports = affiliateApi;
if (typeof globalThis !== 'undefined') globalThis.CardWizAffiliate = affiliateApi;
