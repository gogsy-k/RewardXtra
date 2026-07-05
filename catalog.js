/*
 * CardWiz — Remote Card Catalog
 *
 * Card data ab bundled file mein nahi, backend (Supabase) mein hai.
 * Wahan update karo, extension automatically new data le lega — bina redeploy ke.
 *
 * Flow (cache-first — popup instant, network kabhi block nahi karta):
 *   1. Version-checked cache (ya pehli baar bundled data/cards.json) TURANT do.
 *   2. Background me GET /catalog se refresh karke cache update karo (agli baar
 *      taaza data). Cold/slow backend popup ko slow nahi karega.
 *
 * CardWizAuth.BACKEND_URL se backend URL milta hai (auth.js pehle load honi chahiye).
 * Content scripts mein auth.js nahi hoti, wahan CATALOG_BACKEND_URL use hota hai.
 */

// ⚠️ auth.js wala hi BACKEND_URL yahan bhi daalo (same value).
// 🔧 TODO(PUBLISH): publish se pehle false karo (auth.js ka USE_LOCAL_BACKEND bhi).
const CATALOG_USE_LOCAL = true;
const CATALOG_BACKEND_URL = CATALOG_USE_LOCAL ? 'http://localhost:3000' : 'https://cardwiz-backend.onrender.com';

const CACHE_KEY     = 'rxCatalog_v2';   // v2 = cardType (credit/debit) wala schema
const CACHE_VERSION = 2;

function backendUrl() {
  if (typeof CardWizAuth !== 'undefined' && CardWizAuth.BACKEND_URL) {
    return CardWizAuth.BACKEND_URL;
  }
  return CATALOG_BACKEND_URL;
}

// Offline fallback — koi bhi v2-format cached data chalega (age matter nahi karti,
// kyunki network-first hai; ye sirf tab use hota hai jab backend down ho).
function getCached() {
  return new Promise((resolve) => {
    if (typeof chrome === 'undefined' || !chrome.storage) return resolve(null);
    chrome.storage.local.get([CACHE_KEY], (r) => {
      const entry = r[CACHE_KEY];
      if (!entry || !entry.data) return resolve(null);
      if (entry.v !== CACHE_VERSION) return resolve(null); // purana schema — reject
      resolve(entry.data);
    });
  });
}

function setCache(data) {
  return new Promise((resolve) => {
    if (typeof chrome === 'undefined' || !chrome.storage) return resolve();
    chrome.storage.local.set({ [CACHE_KEY]: { data, fetchedAt: Date.now(), v: CACHE_VERSION } }, resolve);
  });
}

function fetchBundled() {
  const url = (typeof chrome !== 'undefined' && chrome.runtime)
    ? chrome.runtime.getURL('data/cards.json')
    : 'data/cards.json';
  return fetch(url).then((r) => r.json());
}

// Call this to force a fresh fetch next time (e.g. after backend update).
function invalidate() {
  return new Promise((resolve) => {
    if (typeof chrome === 'undefined' || !chrome.storage) return resolve();
    chrome.storage.local.remove([CACHE_KEY], resolve);
  });
}

// Purana cache key (bina cardType ke data) — ek baar saaf kar do.
function clearLegacy() {
  return new Promise((resolve) => {
    if (typeof chrome === 'undefined' || !chrome.storage) return resolve();
    chrome.storage.local.remove(['rxCatalog'], resolve);
  });
}

// Cache-first for SPEED: popup ko kabhi network pe wait nahi karwana.
//   1. Version-checked cache (ya pehli baar bundled file) TURANT return karo.
//   2. Background me backend se refresh karke cache update karo — agli baar
//      taaza data mil jayega. (getCached purana-schema cache reject karta hai,
//      isliye cache-first safe hai; bundled file hamesha current schema.)
// Isse cold/slow backend (Render free-tier) popup ko slow nahi karega.
async function load() {
  await clearLegacy();
  const cached = await getCached();
  const data = cached || await fetchBundled();
  refreshCacheInBackground(); // fire-and-forget — kabhi await nahi
  return data;
}

// Best-effort backend refresh (timeout-bounded) jo cache ko update karta hai.
// KABHI await nahi hota — cold/slow backend popup ko block na kare.
function refreshCacheInBackground() {
  if (typeof fetch === 'undefined') return;
  let ctrl = null;
  try { ctrl = new AbortController(); } catch (_) { /* no AbortController */ }
  const to = ctrl ? setTimeout(() => ctrl.abort(), 4000) : null;
  const opts = ctrl ? { cache: 'no-store', signal: ctrl.signal } : { cache: 'no-store' };
  fetch(`${backendUrl()}/catalog`, opts)
    .then((res) => (res && res.ok ? res.json() : null))
    .then((data) => { if (data) return setCache(data); })
    .catch(() => { /* offline/slow/timeout — cache jaisa hai waisa rehne do */ })
    .finally(() => { if (to) clearTimeout(to); });
}

const catalogApi = { load, invalidate };
if (typeof module !== 'undefined' && module.exports) module.exports = catalogApi;
if (typeof globalThis !== 'undefined') globalThis.CardWizCatalog = catalogApi;
