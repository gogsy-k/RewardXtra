/*
 * CardWiz — Auth module (Phase 8: Google SSO).
 * ----------------------------------------------------
 * Extension Google se ek signed ID token leta hai (chrome.identity), use backend
 * ko bhejta hai, backend verify karke humara session token (JWT) deta hai.
 * Wo token chrome.storage.local mein rakhte hain — har API call pe Bearer header.
 *
 * PRINCIPLE: yahan se sirf account/plan aata hai. Cards/CVV kuch nahi jaata.
 *
 * ⚙️ Setup (2 cheezein bharni hain):
 *   1) GOOGLE_CLIENT_ID — backend wala same client id (Web application).
 *   2) BACKEND_URL — local dev: http://localhost:3000 ; deploy ke baad apna URL.
 */

// ⚠️ Yahan apna Google OAuth client id daalo (backend/.env wala same).
const GOOGLE_CLIENT_ID = '792822617409-42qs5ac2f1v4ud48rjek7a1cugbkgobb.apps.googleusercontent.com';

// ⚠️ Backend ka base URL. Dev: localhost. Production: Render.
// 🔧 TODO(PUBLISH): Chrome Web Store pe publish se pehle USE_LOCAL_BACKEND = false karo
// (catalog.js me bhi yehi toggle hai — dono same rakho).
const USE_LOCAL_BACKEND = true;
const BACKEND_URL = USE_LOCAL_BACKEND ? 'http://localhost:3000' : 'https://cardwiz-backend.onrender.com';

const AUTH_STORAGE_KEY = 'scsAuth'; // { token, user }

// ---------- storage helpers ----------
function getStoredAuth() {
  return new Promise((resolve) => {
    if (typeof chrome === 'undefined' || !chrome.storage) return resolve(null);
    chrome.storage.local.get([AUTH_STORAGE_KEY], (r) => resolve(r[AUTH_STORAGE_KEY] || null));
  });
}

function setStoredAuth(auth) {
  return new Promise((resolve) => {
    if (typeof chrome === 'undefined' || !chrome.storage) return resolve();
    chrome.storage.local.set({ [AUTH_STORAGE_KEY]: auth }, resolve);
  });
}

function clearStoredAuth() {
  return new Promise((resolve) => {
    if (typeof chrome === 'undefined' || !chrome.storage) return resolve();
    chrome.storage.local.remove([AUTH_STORAGE_KEY], resolve);
  });
}

async function isSignedIn() {
  const a = await getStoredAuth();
  return !!(a && a.token);
}

// random nonce — Google id_token flow ke liye required (replay protection).
function randomNonce() {
  const bytes = new Uint8Array(16);
  (crypto || window.crypto).getRandomValues(bytes);
  return Array.from(bytes, (b) => b.toString(16).padStart(2, '0')).join('');
}

// ---------- sign in ----------
// Google login popup kholo (launchWebAuthFlow), id_token nikaalo, backend ko bhejo.
async function signIn() {
  if (GOOGLE_CLIENT_ID.startsWith('YOUR_CLIENT_ID')) {
    throw new Error('auth.js mein GOOGLE_CLIENT_ID set nahi hai (README dekho).');
  }

  const redirectUri = chrome.identity.getRedirectURL(); // https://<ext-id>.chromiumapp.org/
  const nonce = randomNonce();

  const authUrl = new URL('https://accounts.google.com/o/oauth2/v2/auth');
  authUrl.searchParams.set('client_id', GOOGLE_CLIENT_ID);
  authUrl.searchParams.set('response_type', 'id_token');
  authUrl.searchParams.set('redirect_uri', redirectUri);
  authUrl.searchParams.set('scope', 'openid email profile');
  authUrl.searchParams.set('nonce', nonce);
  authUrl.searchParams.set('prompt', 'select_account');

  const redirectResponse = await chrome.identity.launchWebAuthFlow({
    url: authUrl.toString(),
    interactive: true,
  });

  // Google id_token URL ke hash fragment mein deta hai: #id_token=...&...
  const hash = new URL(redirectResponse).hash.slice(1);
  const idToken = new URLSearchParams(hash).get('id_token');
  if (!idToken) throw new Error('Google se id_token nahi mila');

  // Backend verify karega aur humara session token dega.
  const res = await fetch(`${BACKEND_URL}/auth/google`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ idToken }),
  });
  if (!res.ok) throw new Error('Backend sign-in fail (' + res.status + ')');

  const data = await res.json(); // { token, user }
  await setStoredAuth({ token: data.token, user: data.user });
  return data.user;
}

// ---------- sign out ----------
async function signOut() {
  await clearStoredAuth();
}

// ---------- refresh current user from backend ----------
// Stored token se /auth/me hit karo — fresh user + plan. Token expire ho to null.
async function fetchMe() {
  const a = await getStoredAuth();
  if (!a || !a.token) return null;
  try {
    const res = await fetch(`${BACKEND_URL}/auth/me`, {
      headers: { Authorization: `Bearer ${a.token}` },
    });
    if (res.status === 401) {
      await clearStoredAuth(); // token expire/invalid -> logged out
      return null;
    }
    if (!res.ok) return a.user || null; // network hiccup: cached user
    const data = await res.json();
    await setStoredAuth({ token: a.token, user: data.user }); // refresh cache
    return data.user;
  } catch {
    return a.user || null; // offline: cached user dikha do
  }
}

// ---------- authed fetch helper (Phase 10) ----------
// Bearer token inject karo; 401 pe auto sign-out + throw. Card sync isi pe chalta hai.
async function authedFetch(path, opts = {}) {
  const a = await getStoredAuth();
  if (!a || !a.token) throw new Error('Not signed in');
  const headers = { ...(opts.headers || {}), Authorization: `Bearer ${a.token}` };
  if (opts.body && !headers['Content-Type']) headers['Content-Type'] = 'application/json';
  const res = await fetch(`${BACKEND_URL}${path}`, { ...opts, headers });
  if (res.status === 401) { await clearStoredAuth(); throw new Error('Session expired'); }
  return res;
}

// ---------- exports ----------
const authApi = {
  BACKEND_URL,
  signIn, signOut, fetchMe, isSignedIn, getStoredAuth, authedFetch,
};
if (typeof module !== 'undefined' && module.exports) module.exports = authApi;
if (typeof globalThis !== 'undefined') globalThis.CardWizAuth = authApi;
