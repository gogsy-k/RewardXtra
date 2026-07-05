/*
 * Bank / card-brand logos. Each URL was verified to return a REAL logo (not a
 * generic globe) from either the Google favicon service or Icon Horse. Banks/
 * brands whose sites block every logo service are intentionally absent → they
 * fall back to a monogram (see components/BankLogo.tsx), never a broken globe.
 * NOTE: these are EXTERNAL image requests (google.com / icon.horse).
 */

const gf = (d: string) => `https://www.google.com/s2/favicons?domain=${d}&sz=64`;
const ih = (d: string) => `https://icon.horse/icon/${d}`;

// Issuing bank (data/cards.json `bank`) -> verified logo URL. Missing = monogram.
export const BANK_LOGO: Record<string, string> = {
  HDFC: gf("hdfcbank.com"),
  ICICI: gf("icicibank.com"),
  SBI: gf("sbicard.com"),
  Axis: gf("axisbank.com"),
  Kotak: gf("kotak.com"),
  "IDFC FIRST": gf("idfcfirstbank.com"),
  IndusInd: gf("indusind.com"),
  "Yes Bank": gf("yesbank.in"),
  RBL: gf("rblbank.com"),
  "AU Small Finance Bank": gf("aubank.in"),
  HSBC: gf("hsbc.co.in"),
  "American Express": gf("americanexpress.com"),
  "Standard Chartered": gf("sc.com"),
  Citi: gf("citibank.com"),
  "DBS Bank": gf("dbs.com"),
  "Bank of Baroda": gf("bankofbaroda.in"),
  "Bank of India": gf("bankofindia.co.in"),
  "Canara Bank": gf("canarabank.com"),
  "UCO Bank": gf("ucobank.com"),
  "Airtel Payments Bank": gf("airtel.in"),
  "City Union Bank": gf("cityunionbank.com"),
  "South Indian Bank": gf("southindianbank.com"),
  "Tamilnad Mercantile Bank": gf("tmb.in"),
  // Google globed these — Icon Horse has the real mark:
  "Federal Bank": ih("federalbank.co.in"),
  "Central Bank of India": ih("centralbankofindia.co.in"),
  "Indian Bank": ih("indianbank.in"),
  "SBM Bank India": ih("sbmbank.co.in"),
};

// Fintech co-brands: the card is issued on Federal/SBM/CSB etc. but users know
// the BRAND. Matched by a distinctive keyword in the card name (issuing-bank logo
// would be misleading). Order matters — first match wins.
const BRAND_LOGO: Array<[RegExp, string]> = [
  [/\bslice\b/i, ih("sliceit.com")],
  [/\bkiwi\b/i, gf("gokiwi.in")],
  [/\bfi money\b/i, gf("fi.money")],
  [/\bjupiter\b/i, gf("jupiter.money")],
  [/\bscapia\b/i, gf("scapia.cards")],
  [/\bixigo\b/i, gf("ixigo.com")],
  [/\badani\b/i, gf("adanione.com")],
];

/** Logo URL for a card: fintech brand (by name) first, then issuing bank. null = monogram. */
export function cardLogoUrl(name: string, bank: string): string | null {
  for (const [re, url] of BRAND_LOGO) if (re.test(name || "")) return url;
  return BANK_LOGO[bank] || null;
}

/** Monogram fallback: 1 word → first 2 letters; multi-word → initials of first 2 words. */
export function monogram(bank: string): string {
  const words = (bank || "?").trim().split(/\s+/);
  if (words.length === 1) return words[0].slice(0, 2).toUpperCase();
  return (words[0][0] + words[1][0]).toUpperCase();
}
