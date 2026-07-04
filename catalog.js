/*
 * CardWiz — Remote Card Catalog
 *
 * Card data ab bundled file mein nahi, backend (Supabase) mein hai.
 * Wahan update karo, extension automatically new data le lega — bina redeploy ke.
 *
 * Flow (network-first — hamesha taaza data, koi staleness nahi):
 *   1. Backend GET /catalog se fresh fetch karo aur cache update karo.
 *   2. Backend down: pichla cached data use karo (offline fallback).
 *   3. Kabhi backend nahi mila: bundled data/cards.json pe fallback.
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

// Network-first: hamesha backend se taaza data lo. Cache sirf offline fallback ke
// liye — isse stale-format (purana schema) data kabhi serve nahi hoga.
async function load() {
  await clearLegacy();

  // 1. Backend se fresh fetch (primary).
  //    cache:'no-store' => browser ka HTTP cache bypass karo (warna purana
  //    response 1hr tak chipak jaata hai, chrome.storage clear karne pe bhi).
  try {
    const res = await fetch(`${backendUrl()}/catalog`, { cache: 'no-store' });
    if (res.ok) {
      const data = await res.json();
      await setCache(data); // offline ke liye cache update
      return data;
    }
  } catch (_) { /* backend unreachable — neeche fallback */ }

  // 2. Cache fallback (backend down, par pehle kabhi fetch hua tha)
  const cached = await getCached();
  if (cached) return cached;

  // 3. Bundled fallback (kabhi backend nahi mila — bundled file always has cardType)
  return fetchBundled();
}

const catalogApi = { load, invalidate };
if (typeof module !== 'undefined' && module.exports) module.exports = catalogApi;
if (typeof globalThis !== 'undefined') globalThis.CardWizCatalog = catalogApi;
