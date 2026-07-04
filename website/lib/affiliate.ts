/*
 * CardWiz affiliate config — ONE place to wire monetization.
 *
 * HOW TO TURN ON EARNINGS:
 * Once an affiliate network approves you (Cuelinks / INRDeals / EarnKaro / Admitad),
 * paste your "link-wrap" base into LINK_WRAP_BASE below. These networks give you a
 * redirect URL that wraps ANY merchant link and tracks your commission, e.g.:
 *   Cuelinks:  https://linksredirect.com/?pub_id=XXXXX&source=cardwiz&url=
 *   INRDeals:  https://inrdeals.com/deeplink?id=XXXXX&url=
 *   EarnKaro:  (their deeplink/converter base)
 *
 * Until then, leave it "". The "Apply for this card" buttons still work — they link
 * straight to the bank (useful for users) and start EARNING the moment you set this.
 */

// Paste your approved network's link-wrap base here (must end so a URL can be appended).
export const LINK_WRAP_BASE = "";

// Fintech bill-pay / signup CPA partners — earn on a NEW signup, not on the bill itself.
// Fill once you have an approved CPA campaign (e.g. CRED / Cheq via a network).
export const BILL_PAY_PARTNERS: { label: string; url: string }[] = [];

// "Shop & earn" store links (website). Amazon = Associates tag; rest = EarnKaro
// converted deeplinks. Users pick their best card here, then shop → we earn commission.
export const SHOP_LINKS: { name: string; emoji: string; url: string }[] = [
  { name: "Amazon", emoji: "📦", url: "https://www.amazon.in/?tag=gogsy-21" },
  { name: "Flipkart", emoji: "🛒", url: "https://fktr.in/IIyS1ly" },
  { name: "Myntra", emoji: "👗", url: "https://myntr.it/zPuyfNe" },
  { name: "Ajio", emoji: "👕", url: "https://ajiio.in/T7czxq6" },
  { name: "Nykaa", emoji: "💄", url: "https://inrdeals.com/gur478927530/https://www.nykaa.com" },
  { name: "Tata CLiQ", emoji: "🛍️", url: "https://bitli.in/fb1ggEV" },
  { name: "MakeMyTrip", emoji: "✈️", url: "https://bitli.in/X5Q4uhp" },
  { name: "Cleartrip", emoji: "🧳", url: "https://bitli.in/G9rfjrt" },
];

// Official credit-card pages per bank (the destination an "Apply" button points to).
// Keys must match the catalog's `bank` field exactly.
const BANK_APPLY: Record<string, string> = {
  HDFC: "https://www.hdfcbank.com/personal/pay/cards/credit-cards",
  Axis: "https://www.axisbank.com/retail/cards/credit-card",
  SBI: "https://www.sbicard.com/en/personal/credit-cards.page",
  ICICI: "https://www.icicibank.com/personal-banking/cards/credit-card",
  Kotak: "https://www.kotak.com/en/personal-banking/cards/credit-cards.html",
  RBL: "https://www.rblbank.com/category/credit-cards",
  IndusInd: "https://www.indusind.com/in/en/personal/cards/credit-card.html",
  "AU Small Finance Bank": "https://www.aubank.in/credit-cards",
  "IDFC FIRST": "https://www.idfcfirstbank.com/credit-card",
  "Federal Bank": "https://www.federalbank.co.in/credit-card",
  "Yes Bank": "https://www.yesbank.com/personal-banking/yes-individual/cards/credit-cards",
  HSBC: "https://www.hsbc.co.in/credit-cards/",
  "Standard Chartered": "https://www.sc.com/in/credit-cards/",
  "American Express": "https://www.americanexpress.com/en-in/credit-cards/",
  "DBS Bank": "https://www.dbs.com/in/personal/cards/default.page",
  "Bank of Baroda": "https://www.bobcard.co.in/",
};

// ── INRDeals CPA affiliate apply links (publisher gur478927530) ──────────────────────────
// EARN a commission on a NEW card application. Format verified from INRDeals' own generated
// links: id + url + campaign drive tracking (RAW url append — that's how INRDeals builds them).
// INRDeals only has CPA for these ~13 cards — the rest of the catalog falls back to the direct
// bank page (no commission) until we add CardInsider/BankBazaar. Harvested 2026-07-05.
const INR_PUB = "gur478927530";
const inr = (url: string, campaign: string) =>
  `https://inr.deals/redirect?id=${INR_PUB}&src=cardwiz&url=${url}&campaign=${campaign}`;

// Card-specific (override bank-level) — keyed by catalog card id. Co-brands / distinct campaigns.
const CARD_APPLY_AFFILIATE: Record<string, string> = {
  "sbi-simplyclick": inr("https://www.sbicard.com", "cpa_lead"),
  "sbi-cashback": inr("https://www.sbicard.com", "cpa_cb"),
  "scapia-federal": inr("https://apply.scapia.cards/", "cpa"),
  "jupiter-edge-csb": inr("https://web.jupiter.money/rupay-csb/web-ob/landing", "cpa"),
};

// Bank-level — every card of the bank routes to the bank's INRDeals apply flow (earns on apply).
const BANK_APPLY_AFFILIATE: Record<string, string> = {
  HDFC: inr("https://applyonline.hdfcbank.com/cards/credit-cards.html", "cpl"),
  Axis: inr("https://web.axis.bank.in/DigitalChannel/WebForm/", "cpl"),
  SBI: inr("https://www.sbicard.com", "cpa_lead"),
  "AU Small Finance Bank": inr("https://cconboarding.aubank.in/auccself/#/landing", "cpa"),
  "Federal Bank": inr("https://creditcards.federalbank.co.in", "cpa"),
  "IDFC FIRST": inr("https://www.idfcfirstbank.com/credit-card/ntb-diy/apply", "cpa"),
  IndusInd: inr("https://induseasycredit.indusind.bank.in/", "cpa"),
  HSBC: inr("https://www.accountopening.hsbc.co.in/credit-cards/", "cpa"),
  "Bank of Baroda": inr("https://mycard.bobcard.tech/splash-screen", "cpl"),
  "Yes Bank": inr("https://applyonline.getpopcard.co/", "cpl"), // only Yes CPA (POP co-brand)
};

// Apply URL for a card. Priority: card-specific affiliate → bank-level affiliate → direct bank
// page (no commission). Pass cardId for card-specific matches (co-brands / distinct campaigns).
export function cardApplyUrl(bank: string, cardId?: string): string | null {
  if (cardId && CARD_APPLY_AFFILIATE[cardId]) return CARD_APPLY_AFFILIATE[cardId];
  if (BANK_APPLY_AFFILIATE[bank]) return BANK_APPLY_AFFILIATE[bank];
  const dest = BANK_APPLY[bank];
  if (!dest) return null;
  return LINK_WRAP_BASE ? LINK_WRAP_BASE + encodeURIComponent(dest) : dest;
}
