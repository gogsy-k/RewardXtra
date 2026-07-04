/*
 * CardWiz — Popup UI logic.
 * recommend.js (engine) + data/cards.json (brain) + chrome.storage (wallet).
 *
 * Phase 1 (Card Wallet): user apne cards add/edit/delete kare. Har card:
 *   { id, cardId, nickname, last4 }
 * NOTE: full card number / CVV KABHI store nahi (plan ka core principle).
 */

const CATEGORY_LABELS = {
  amazon: 'Amazon', flipkart: 'Flipkart', myntra: 'Myntra',
  online_shopping: 'Online Shopping (general)',
  food_delivery: 'Food Delivery (Swiggy/Zomato)', dining: 'Dining / Restaurant',
  grocery: 'Grocery', instamart: 'Instamart / Quick grocery',
  travel: 'Travel (general)', flights: 'Flights', hotels: 'Hotels',
  fuel: 'Fuel / Petrol', utilities: 'Bills / Utilities / Recharge',
  rent: 'Rent', education: 'Education / Fees', insurance: 'Insurance',
  wallet: 'Wallet load (Paytm etc.)', uber: 'Uber', cab: 'Cab / Ola',
  entertainment: 'Movies / Entertainment', upi: 'UPI payment',
  offline: 'Offline shop (card swipe)', government: 'Government / Tax', gaming: 'Gaming',
};

// Bank -> bill-payment URL (best-effort official). Na mile to CRED fallback.
// Hum payment NAHI karte — sirf user ko unke bank/CRED pe bhej dete hain.
const CRED_URL = 'https://cred.club';
const BANK_PAY_URLS = {
  'HDFC': 'https://www.hdfcbank.com/personal/pay/cards/credit-cards/credit-card-bill-payment',
  'SBI': 'https://www.sbicard.com/en/personal/manage-your-card/credit-card-bill-payment.page',
  'ICICI': 'https://www.icicibank.com/personal-banking/cards/credit-card/credit-card-bill-payment',
  'Axis': 'https://www.axisbank.com/retail/cards/credit-card/credit-card-payments',
  'IDFC FIRST': 'https://www.idfcfirstbank.com/credit-card',
  'American Express': 'https://www.americanexpress.com/in/account-management/login/',
};

const $ = (id) => document.getElementById(id);
const els = {
  category: $('category'), amount: $('amount'), goBtn: $('goBtn'),
  onlyMine: $('onlyMine'), results: $('results'),
  cardsList: $('cardsList'), addCardBtn: $('addCardBtn'),
  cardForm: $('cardForm'), formCardId: $('formCardId'),
  formNickname: $('formNickname'), formLast4: $('formLast4'),
  formDueDay: $('formDueDay'), formRemindBefore: $('formRemindBefore'),
  formErr: $('formErr'), saveCardBtn: $('saveCardBtn'), cancelCardBtn: $('cancelCardBtn'),
  billsList: $('billsList'),
  capsFoot: $('capsFoot'), capsPeriod: $('capsPeriod'), resetCapsBtn: $('resetCapsBtn'),
  premiumStatus: $('premiumStatus'), premiumToggle: $('premiumToggle'),
  analyticsBox: $('analyticsBox'), affDisclosure: $('affDisclosure'),
  accountBox: $('accountBox'),
};

let DB = null;        // cards.json
let myCards = [];     // wallet: [{id, cardId, nickname, last4, dueDay, reminderDaysBefore}]
let capUsage = null;  // { period, used } — Phase 5 monthly cap tracking
let isPremium = false;// Phase 6 premium flag (dev toggle / backend-synced)
let currentUser = null;// Phase 8: signed-in Google user, ya null
let syncEnabled = true;// Phase 10: cloud sync (default ON; signed-in pe hi active)
let editingId = null; // agar edit ho raha hai to uska wallet-entry id
let cardsTab = 'credit'; // Cards section ka active tab: 'credit' | 'debit'
let lastRanked = [];  // last recommendation results (log button ke liye)
let bestTier = 'elite'; // Best Cards (Tab 1) tier filter: elite|premium|solid (default Elite)
let waiverSpend = {};   // cumulative spend per cardId, grows on "Use kiya"
let benefitsUsed = {};  // { "card-id::lounge::2026": 3, "card-id::movie::2026-06": 1 }

// ---------- Init ----------
async function init() {
  await CardWizI18n.loadLang();   // language pref (default en)
  CardWizI18n.applyStaticI18n();  // static UI strings translate
  applyExtTitle();                // icon tooltip in selected language
  DB = await CardWizCatalog.load();
  buildCategoryDropdown();
  buildCardSelect();
  await loadWallet();
  await loadCapUsage();
  await loadWaiverSpend();
  await loadBenefitsUsed();
  await loadPremium();
  await loadAuth(); // Phase 8: signed-in user + plan sync (backend)
  await loadSyncPref(); // Phase 10: cloud sync pref (default ON)
  if (currentUser && syncEnabled) await doSyncNow(); // pull+merge+push cards
  if (currentUser && !isPremium) await autoVerifyPayment(); // Phase 11: pending payment auto-detect
  renderMyCards();
  renderBestCards(); // Tab 1: curated "best cards in market"
  renderFeatured(); // Sponsored card — free users only

  // View switching
  document.querySelectorAll('nav button').forEach((btn) => {
    btn.addEventListener('click', () => switchView(btn.dataset.view));
  });

  // Cards section ke Debit/Credit toggle tabs
  document.querySelectorAll('.cards-tabs button').forEach((btn) => {
    btn.addEventListener('click', () => { cardsTab = btn.dataset.cardtype; buildCardSelect(); renderMyCards(); });
  });

  // Best Cards tier filter
  document.querySelectorAll('#bestFilter button').forEach((btn) => {
    btn.addEventListener('click', () => { bestTier = btn.dataset.tier; renderBestCards(); });
  });

  // Card info modal close (X button ya overlay pe click)
  const modal = $('cardInfoModal');
  if (modal) modal.addEventListener('click', (e) => { if (e.target === modal) closeCardInfo(); });

  // CIBIL score checker button
  const cibilBtn = $('cibilBtn');
  if (cibilBtn) cibilBtn.addEventListener('click', openCibil);

  // AI chat → open /ai on cardwiz.in
  const aiChatBtn = $('aiChatBtn');
  if (aiChatBtn) aiChatBtn.addEventListener('click', () => {
    window.open('https://cardwiz.in/ai', '_blank', 'noopener');
  });

  // Quiz teaser → open /find-my-card on cardwiz.in
  const quizTeaserBtn = $('quizTeaserBtn');
  if (quizTeaserBtn) quizTeaserBtn.addEventListener('click', () => {
    window.open('https://cardwiz.in/find-my-card', '_blank', 'noopener');
  });

  // Results collapse / expand toggle
  const resultsToggleBtn = $('resultsToggleBtn');
  if (resultsToggleBtn) {
    resultsToggleBtn.addEventListener('click', () => {
      const nowVisible = els.results.hidden;
      els.results.hidden = !nowVisible;
      resultsToggleBtn.textContent = nowVisible
        ? CardWizI18n.t('results_hide')
        : CardWizI18n.t('results_show');
    });
  }

  // Language buttons (English / Hinglish / Hindi)
  document.querySelectorAll('#langBtns button').forEach((btn) => {
    btn.addEventListener('click', () => setLanguage(btn.dataset.lang));
  });
  syncLangButtons();

  els.goBtn.addEventListener('click', runRecommendation);
  els.onlyMine.addEventListener('change', runRecommendation);
  els.resetCapsBtn.addEventListener('click', resetCaps);
  els.premiumToggle.addEventListener('click', togglePremium);

  els.addCardBtn.addEventListener('click', () => openForm());
  els.cancelCardBtn.addEventListener('click', closeForm);
  els.saveCardBtn.addEventListener('click', saveCard);
  els.formCardId.addEventListener('change', updateFormForCardType);
  // last4 = sirf digits
  els.formLast4.addEventListener('input', () => {
    els.formLast4.value = els.formLast4.value.replace(/\D/g, '').slice(0, 4);
  });
}

function switchView(view) {
  document.querySelectorAll('nav button').forEach((b) =>
    b.classList.toggle('active', b.dataset.view === view));
  $('view-best').hidden = view !== 'best';
  $('view-suggest').hidden = view !== 'suggest';
  $('view-mycards').hidden = view !== 'mycards';
  $('view-more').hidden = view !== 'more';
  if (view === 'best') renderBestCards();
  if (view === 'more') renderMore();
  if (view === 'suggest') renderFeatured(); // Sponsored — free users only
}

function buildCategoryDropdown() {
  for (const cat of DB.categories) {
    const opt = document.createElement('option');
    opt.value = cat;
    opt.textContent = CATEGORY_LABELS[cat] || cat;
    els.category.appendChild(opt);
  }
}

// Card credit hai ya debit. cardType missing = 'credit' (purane cards sab credit the).
function cardTypeOf(cat) {
  return cat && cat.cardType === 'debit' ? 'debit' : 'credit';
}

// Add/Edit form ka dropdown — sirf active tab (credit ya debit) ke cards.
function buildCardSelect() {
  els.formCardId.innerHTML = '';
  const filtered = DB.cards.filter((c) => cardTypeOf(c) === cardsTab);
  for (const card of filtered) {
    const opt = document.createElement('option');
    opt.value = card.id;
    const fee = card.annualFee === 0 ? 'LTF' : '₹' + card.annualFee + '/yr';
    opt.textContent = `${card.name} (${fee})`;
    els.formCardId.appendChild(opt);
  }
  updateFormForCardType();
}

// ---------- Wallet storage ----------
function loadWallet() {
  return new Promise((resolve) => {
    if (typeof chrome === 'undefined' || !chrome.storage) { myCards = []; return resolve(); }
    chrome.storage.local.get(['myCards', 'ownedCardIds'], (res) => {
      if (Array.isArray(res.myCards)) {
        myCards = res.myCards;
      } else if (Array.isArray(res.ownedCardIds)) {
        // Purane "wallet lite" model se migrate karo.
        myCards = res.ownedCardIds.map((cardId) => ({ id: uid(), cardId, nickname: '', last4: '' }));
        saveWallet();
      } else {
        myCards = [];
      }
      resolve();
    });
  });
}

function saveWallet() {
  if (typeof chrome !== 'undefined' && chrome.storage) {
    chrome.storage.local.set({ myCards });
  }
}

function uid() {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) return crypto.randomUUID();
  return 'c_' + Date.now() + '_' + Math.random().toString(36).slice(2, 8);
}

// ---------- Cap usage storage (Phase 5) ----------
function loadCapUsage() {
  return new Promise((resolve) => {
    const done = (raw) => {
      // Load pe hi normalize → naya mahina ho to auto-reset.
      capUsage = window.CardWizCapTracker.normalize(raw, new Date());
      if (!raw || raw.period !== capUsage.period) saveCapUsage(); // reset persist
      resolve();
    };
    if (typeof chrome === 'undefined' || !chrome.storage) return done(null);
    chrome.storage.local.get(['capUsage'], (r) => done(r.capUsage));
  });
}

function saveCapUsage() {
  if (typeof chrome !== 'undefined' && chrome.storage) chrome.storage.local.set({ capUsage });
}

function resetCaps() {
  if (!confirm('Is mahine ka cap usage reset karein?')) return;
  capUsage = window.CardWizCapTracker.resetAll(new Date());
  saveCapUsage();
  runRecommendation();
}

// ---------- Waiver spend + benefits storage (Sprint 2) ----------
function loadWaiverSpend() {
  return new Promise((resolve) => {
    if (typeof chrome === 'undefined' || !chrome.storage) return resolve();
    chrome.storage.local.get(['waiverSpend'], (r) => { waiverSpend = r.waiverSpend || {}; resolve(); });
  });
}
function saveWaiverSpend() {
  if (typeof chrome !== 'undefined' && chrome.storage) chrome.storage.local.set({ waiverSpend });
}
function loadBenefitsUsed() {
  return new Promise((resolve) => {
    if (typeof chrome === 'undefined' || !chrome.storage) return resolve();
    chrome.storage.local.get(['benefitsUsed'], (r) => { benefitsUsed = r.benefitsUsed || {}; resolve(); });
  });
}
function saveBenefitsUsed() {
  if (typeof chrome !== 'undefined' && chrome.storage) chrome.storage.local.set({ benefitsUsed });
}

// ---------- Premium (Phase 6) ----------
function loadPremium() {
  return new Promise((resolve) => {
    if (typeof chrome === 'undefined' || !chrome.storage) { isPremium = false; return resolve(); }
    chrome.storage.local.get(['isPremium'], (r) => { isPremium = !!r.isPremium; resolve(); });
  });
}

function togglePremium() {
  // Signed in & not premium: pricing website pe bhejo (payment ab extension mein direct nahi).
  if (currentUser) {
    if (!isPremium) openPricing();
    return;
  }
  // Signed out: dev toggle (local testing ke liye).
  isPremium = !isPremium;
  if (typeof chrome !== 'undefined' && chrome.storage) chrome.storage.local.set({ isPremium });
  renderMore();
  renderMyCards(); // card-limit gating refresh
}

// Subscribe ab direct pay nahi karta — cardwiz.in/pricing kholta hai (3 plans wahan).
function openPricing() {
  const url = (window.CardWizPremium && window.CardWizPremium.PRICING_URL) || 'https://cardwiz.in/pricing';
  window.open(url, '_blank', 'noopener');
}

// ---------- Premium upgrade (Razorpay Subscriptions — free trial + auto-pay) ----------

// Popup khulte hi silently check: subscription card save hua? ya old payment paid? -> premium unlock.
async function autoVerifyPayment() {
  if (!currentUser || isPremium || typeof CardWizAuth === 'undefined') return;
  try {
    // New flow: subscription check (card authenticated = premium)
    const subRes = await CardWizAuth.authedFetch('/payment/verify-subscription', { method: 'POST' });
    if (subRes.ok) {
      const subData = await subRes.json();
      if (subData.status === 'active' || isPaidPlan(subData.plan)) {
        currentUser = await CardWizAuth.fetchMe();
        applyAuthToPremium();
        return;
      }
    }
    // Old flow fallback: one-time payment link (backward compat)
    const res = await CardWizAuth.authedFetch('/payment/verify', { method: 'POST' });
    if (!res.ok) return;
    const data = await res.json();
    if (data.status === 'paid' || isPaidPlan(data.plan)) {
      currentUser = await CardWizAuth.fetchMe();
      applyAuthToPremium();
    }
  } catch (e) { /* offline / koi pending nahi — ignore */ }
}

// ---------- Account / Google SSO (Phase 8) ----------
function loadAuth() {
  return new Promise(async (resolve) => {
    if (typeof CardWizAuth === 'undefined') return resolve();
    try {
      currentUser = await CardWizAuth.fetchMe(); // null = signed out / token expired
    } catch {
      currentUser = null;
    }
    applyAuthToPremium();
    resolve();
  });
}

// Pro includes Premium — dono paid features unlock karte hain.
function isPaidPlan(plan) { return plan === 'premium' || plan === 'pro'; }

// Signed in -> plan backend se authoritative. Signed out -> local dev flag chalta hai.
function applyAuthToPremium() {
  if (currentUser) isPremium = isPaidPlan(currentUser.plan);
}

function renderAccount() {
  const box = els.accountBox;
  if (!box) return;
  if (typeof CardWizAuth === 'undefined') {
    box.innerHTML = '<div class="more-sub">' + CardWizI18n.t('pop_auth_fail') + '</div>';
    return;
  }

  if (currentUser) {
    const initial = (currentUser.name || currentUser.email || '?').charAt(0).toUpperCase();
    const pic = safePictureUrl(currentUser.picture);
    const avatar = pic ? `<img src="${pic}" alt="">` : escapeHtml(initial);
    box.innerHTML =
      `<div class="acct-row">
         <div class="acct-avatar">${avatar}</div>
         <div class="acct-info">
           <div class="acct-name">${escapeHtml(currentUser.name || 'User')}</div>
           <div class="acct-email">${escapeHtml(currentUser.email || '')}</div>
         </div>
         <span class="pill ${isPremium ? 'pro' : 'free'}">${currentUser.plan === 'pro' ? 'PRO' : isPremium ? 'PREMIUM' : 'FREE'}</span>
       </div>
       <button class="ghost" id="signOutBtn" style="margin-top:10px;">${escapeHtml(CardWizI18n.t('acc_signout'))}</button>`;
    const b = $('signOutBtn');
    if (b) b.addEventListener('click', doSignOut);
  } else {
    box.innerHTML =
      `<div class="more-sub">${escapeHtml(CardWizI18n.t('acc_blurb'))}</div>
       <button class="signin-btn" id="signInBtn">${escapeHtml(CardWizI18n.t('acc_signin'))}</button>
       <div class="acct-err" id="acctErr"></div>`;
    const b = $('signInBtn');
    if (b) b.addEventListener('click', doSignIn);
  }
}

async function doSignIn() {
  const btn = $('signInBtn');
  const err = $('acctErr');
  if (btn) { btn.disabled = true; btn.textContent = CardWizI18n.t('acc_signing'); }
  if (err) err.textContent = '';
  try {
    currentUser = await CardWizAuth.signIn();
    applyAuthToPremium();
    if (syncEnabled) await doSyncNow(); // Phase 10: local cards ko cloud mein merge
    renderMore();
    renderMyCards(); // card-limit gating refresh
  } catch (e) {
    if (err) err.textContent = (e && e.message) || 'Sign-in fail ho gaya';
    if (btn) { btn.disabled = false; btn.textContent = CardWizI18n.t('acc_signin'); }
  }
}

async function doSignOut() {
  if (typeof CardWizAuth !== 'undefined') await CardWizAuth.signOut();
  currentUser = null;
  await loadPremium();   // signed out -> wapas local dev premium flag pe
  renderMore();
  renderMyCards();
}

// Sirf https Google avatar allow — innerHTML injection guard.
function safePictureUrl(url) {
  if (typeof url !== 'string') return '';
  return /^https:\/\//.test(url) ? url.replace(/"/g, '%22') : '';
}

function escapeHtml(s) {
  return String(s).replace(/[&<>"']/g, (c) =>
    ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
}

// ---------- Cloud Sync (Phase 10) ----------
function loadSyncPref() {
  return new Promise((resolve) => {
    if (typeof chrome === 'undefined' || !chrome.storage) { syncEnabled = true; return resolve(); }
    chrome.storage.local.get(['syncEnabled'], (r) => {
      syncEnabled = r.syncEnabled !== false; // undefined -> true (default ON)
      resolve();
    });
  });
}

function saveSyncPref() {
  if (typeof chrome !== 'undefined' && chrome.storage) chrome.storage.local.set({ syncEnabled });
}

// Pull + merge + push — local aur cloud dono consistent, bina kisi device ka data khoye.
async function doSyncNow() {
  if (!currentUser || !syncEnabled || typeof CardWizSync === 'undefined') return;
  try {
    const merged = await CardWizSync.syncNow(myCards);
    myCards = merged;
    saveWallet();
    renderMyCards();
  } catch (e) { /* offline / token expired — local rehne do */ }
}

// Local change ke baad cloud update (best-effort, signed-in + sync-on pe hi).
function pushIfSyncing() {
  if (!currentUser || !syncEnabled || typeof CardWizSync === 'undefined') return;
  CardWizSync.push(myCards).catch(() => {});
}

async function toggleSync() {
  syncEnabled = !syncEnabled;
  saveSyncPref();
  if (syncEnabled && currentUser) await doSyncNow(); // ON karte hi sync
  renderMore();
  renderMyCards();
}

function renderSync() {
  const box = $('syncBox');
  if (!box) return;
  if (!currentUser) {
    box.innerHTML = `<div class="more-sub">${CardWizI18n.t('sync_signin')}</div>`;
    return;
  }
  if (syncEnabled) {
    box.innerHTML =
      `<div class="more-sub">${CardWizI18n.t('sync_on_msg')}</div>
       <button class="ghost" id="syncToggle" style="margin-top:8px;">${escapeHtml(CardWizI18n.t('sync_off_btn'))}</button>`;
  } else {
    box.innerHTML =
      `<div class="more-sub">${CardWizI18n.t('sync_off_msg')}</div>
       <button class="signin-btn" id="syncToggle" style="margin-top:8px;">${escapeHtml(CardWizI18n.t('sync_on_btn'))}</button>`;
  }
  const b = $('syncToggle');
  if (b) b.addEventListener('click', toggleSync);
}

// -------- Offer Watchlist --------
const WATCHLIST_BACKEND = 'https://cardwiz-backend.onrender.com';

async function watchlistAuthFetch(path, opts = {}) {
  const auth = await getStoredAuth();
  if (!auth) return null;
  return fetch(`${WATCHLIST_BACKEND}${path}`, {
    ...opts,
    headers: { Authorization: `Bearer ${auth.token}`, 'Content-Type': 'application/json', ...(opts.headers || {}) },
  });
}

async function renderWatchlist() {
  const card = $('watchlistCard');
  if (!card) return;

  if (!currentUser) { card.hidden = true; return; }
  card.hidden = false;

  // Load keywords
  let keywords = [];
  try {
    const res = await watchlistAuthFetch('/watchlist');
    if (res && res.ok) ({ keywords } = await res.json());
  } catch (_) {}

  renderWatchlistChips(keywords);

  // Wire add button (once)
  const addBtn = $('watchlistAddBtn');
  const input  = $('watchlistInput');
  if (addBtn && !addBtn.dataset.wired) {
    addBtn.dataset.wired = '1';
    addBtn.addEventListener('click', () => doAddWatchword());
    input.addEventListener('keydown', (e) => { if (e.key === 'Enter') doAddWatchword(); });
  }
}

function renderWatchlistChips(keywords) {
  const chips = $('watchlistChips');
  if (!chips) return;
  if (!keywords.length) {
    chips.innerHTML = `<span style="font-size:10px;color:#8A93AC;">${CardWizI18n.t('watchlist_empty')}</span>`;
    return;
  }
  chips.innerHTML = keywords.map((kw) =>
    `<span style="display:inline-flex;align-items:center;gap:4px;background:#222C42;border:1px solid #2A3450;border-radius:20px;padding:3px 8px;font-size:10px;color:#E8ECF4;">
      ${escapeHtml(kw)}
      <button data-kw="${escapeHtml(kw)}" style="background:none;border:none;color:#FB7185;cursor:pointer;font-size:11px;padding:0;line-height:1;" class="wl-remove">×</button>
    </span>`
  ).join('');
  chips.querySelectorAll('.wl-remove').forEach((btn) => {
    btn.addEventListener('click', () => doRemoveWatchword(btn.dataset.kw));
  });
}

async function doAddWatchword() {
  const input = $('watchlistInput');
  const msg   = $('watchlistMsg');
  const kw    = (input ? input.value : '').trim().toLowerCase();
  if (!kw || kw.length < 2) return;
  try {
    const res = await watchlistAuthFetch('/watchlist', { method: 'POST', body: JSON.stringify({ keyword: kw }) });
    if (!res) return;
    if (!res.ok) {
      const d = await res.json().catch(() => ({}));
      if (msg) msg.textContent = d.error || 'Error';
      return;
    }
    const { keywords } = await res.json();
    if (input) input.value = '';
    if (msg) msg.textContent = '';
    renderWatchlistChips(keywords);
  } catch (_) {
    if (msg) msg.textContent = 'Network error';
  }
}

async function doRemoveWatchword(kw) {
  try {
    const res = await watchlistAuthFetch(`/watchlist/${encodeURIComponent(kw)}`, { method: 'DELETE' });
    if (!res || !res.ok) return;
    const { keywords } = await res.json();
    renderWatchlistChips(keywords);
  } catch (_) {}
}

// Cards-tab privacy line — sync state ke hisaab se honest message.
function updateCardsPrivacy() {
  const el = $('cardsPrivacy');
  if (!el) return;
  if (currentUser && syncEnabled) {
    el.innerHTML = CardWizI18n.t('cards_synced');
  } else {
    el.innerHTML = CardWizI18n.t('cards_local');
  }
}

function renderMore() {
  const P = window.CardWizPremium;

  // Account / SSO (Phase 8) — sabse upar.
  renderAccount();
  renderSync(); // Cloud Sync card (Phase 10)

  // Premium status + toggle
  const freeMsg = CardWizI18n.t('prem_free')
    .replace('{m}', P.PREMIUM_MONTHLY_INR).replace('{y}', P.PREMIUM_YEARLY_INR)
    .replace('{s}', P.PREMIUM_MONTHLY_INR * 12 - P.PREMIUM_YEARLY_INR);
  els.premiumStatus.innerHTML = isPremium
    ? `<span class="pill pro">PREMIUM</span> ${escapeHtml(CardWizI18n.t('prem_active'))}`
    : `<span class="pill free">FREE</span> ${escapeHtml(freeMsg)}`;
  // Action button — signed in free: plan selector + Razorpay subscription; premium: hidden;
  // signed out: dev toggle (local testing).
  const devNote = $('premiumDevNote');
  const btn = els.premiumToggle;
  if (currentUser) {
    btn.hidden = isPremium;
    btn.textContent = CardWizI18n.t('prem_upgrade');
    if (devNote) devNote.textContent = isPremium
      ? CardWizI18n.t('prem_note_active')
      : CardWizI18n.t('prem_note_upgrade');
  } else {
    btn.hidden = false;
    btn.textContent = isPremium ? CardWizI18n.t('prem_dev_off') : CardWizI18n.t('prem_dev_on');
    if (devNote) devNote.textContent = CardWizI18n.t('prem_note_out');
  }

  // Offer Watchlist — signed-in users only
  renderWatchlist();

  // Analytics (premium-gated)
  renderAnalytics();

  // Affiliate disclosure
  els.affDisclosure.textContent = window.CardWizAffiliate.DISCLOSURE +
    (window.CardWizReferral ? ' ' + window.CardWizReferral.DISCLOSURE : '') +
    ' Networks: Amazon Associates, Flipkart, Cuelinks, card-referral.';

  // About: privacy link + version (manifest se).
  const verEl = $('versionLabel');
  const link = $('privacyLink');
  if (typeof chrome !== 'undefined' && chrome.runtime) {
    const mf = chrome.runtime.getManifest();
    if (verEl) verEl.textContent = `v${mf.version}`;
    if (link && !link.dataset.wired) {
      link.dataset.wired = '1';
      link.addEventListener('click', (e) => {
        e.preventDefault();
        window.open(chrome.runtime.getURL('privacy.html'), '_blank');
      });
    }
  }
}

function renderAnalytics() {
  const P = window.CardWizPremium;
  if (!P.canUseFeature('spending_analytics', isPremium)) {
    els.analyticsBox.innerHTML =
      `<div class="upgrade-note">${CardWizI18n.t('an_locked')}
       <button id="analyticsUpgrade">${escapeHtml(CardWizI18n.t('prem_upgrade'))}</button></div>`;
    const b = $('analyticsUpgrade');
    if (b) b.addEventListener('click', togglePremium);
    return;
  }
  // Premium: capUsage se simple monthly reward summary.
  const used = (capUsage && capUsage.used) || {};
  const byCard = {};
  for (const key of Object.keys(used)) {
    const cardId = key.split('::')[0];
    byCard[cardId] = (byCard[cardId] || 0) + used[key];
  }
  const entries = Object.entries(byCard).sort((a, b) => b[1] - a[1]);
  if (entries.length === 0) {
    els.analyticsBox.innerHTML = `<div class="more-sub">${escapeHtml(CardWizI18n.t('an_none'))}</div>`;
    return;
  }
  const total = entries.reduce((s, [, v]) => s + v, 0);
  let html = `<div class="more-sub">${escapeHtml(CardWizI18n.t('an_total'))} (${capUsage.period}): <b>₹${Math.round(total)}</b></div>`;
  for (const [cardId, val] of entries) {
    const cat = catalogCard(cardId);
    html += `<div class="more-sub">• ${cat ? cat.name : cardId}: ₹${Math.round(val)}</div>`;
  }
  els.analyticsBox.innerHTML = html;
}

function catalogCard(cardId) {
  return DB.cards.find((c) => c.id === cardId);
}

// ---------- My Cards view (CRUD) ----------
function renderMyCards() {
  updateCardsPrivacy(); // sync-aware privacy line (Phase 10)
  const stale = $('limitNote');
  if (stale) stale.remove();
  // Tab toggle ka active state set karo.
  document.querySelectorAll('.cards-tabs button').forEach((b) =>
    b.classList.toggle('active', b.dataset.cardtype === cardsTab));

  els.cardsList.innerHTML = '';

  // Portfolio Score — rendered for ALL wallet cards (not just active tab)
  if (myCards.length > 0 && DB && DB.cards && typeof CardWizPortfolioScore !== 'undefined') {
    els.cardsList.appendChild(buildPortfolioScoreWidget());
  }

  // Sirf active tab (credit ya debit) ke cards dikhao.
  const items = [];
  for (const mc of myCards) {
    const cat = catalogCard(mc.cardId);
    if (!cat) continue; // catalog se hata diya gaya card (rare)
    if (cardTypeOf(cat) === cardsTab) items.push({ mc, cat });
  }

  if (items.length === 0) {
    const empty = document.createElement('div');
    empty.className = 'empty';
    empty.textContent = CardWizI18n.t('mc_empty');
    els.cardsList.appendChild(empty);
  } else {
    for (const { mc, cat } of items) els.cardsList.appendChild(makeCardRow(mc, cat));
  }
  positionCardForm(); // edit form ko sahi jagah (edited row ke neeche / default) rakho
}

// Shared edit/add form ko edit ho rahe card ke row ke turant neeche rakho.
// Warna default: "+ Add a new card" button ke neeche (add-new ke liye).
function positionCardForm() {
  if (editingId != null && !els.cardForm.hidden) {
    const row = els.cardsList.querySelector(`.mycard[data-wallet-id="${editingId}"]`);
    if (row) { row.insertAdjacentElement('afterend', els.cardForm); return; }
  }
  els.addCardBtn.insertAdjacentElement('afterend', els.cardForm);
}

function buildPortfolioScoreWidget() {
  const { portfolioScore, SCORE_CATS } = CardWizPortfolioScore;
  const result = portfolioScore(myCards, DB.cards);
  const { score, details, gaps } = result;

  const colorClass = score >= 80 ? 'ps-high' : score >= 40 ? 'ps-mid' : 'ps-low';

  const widget = document.createElement('div');
  widget.className = 'portfolio-score-card';

  // Header
  const hdr = document.createElement('div');
  hdr.className = 'ps-header';
  const titleEl = document.createElement('span');
  titleEl.className = 'ps-title';
  titleEl.textContent = '🏆 Portfolio Score';
  const scoreEl = document.createElement('span');
  scoreEl.className = `ps-score ${colorClass}`;
  scoreEl.textContent = String(score);
  hdr.appendChild(titleEl);
  hdr.appendChild(scoreEl);
  widget.appendChild(hdr);

  // Progress bar segments
  const barRow = document.createElement('div');
  barRow.className = 'ps-bar-row';
  SCORE_CATS.forEach((cat) => {
    const seg = document.createElement('div');
    const detail = details.find((d) => d.id === cat.id);
    seg.className = 'ps-bar-seg' + (detail && detail.covered ? ` filled ${colorClass.replace('ps-', '')}` : '');
    barRow.appendChild(seg);
  });
  widget.appendChild(barRow);

  // Category pills
  const catsRow = document.createElement('div');
  catsRow.className = 'ps-cats';
  for (const d of details) {
    const pill = document.createElement('span');
    pill.className = `ps-cat ${d.covered ? 'ok' : 'gap'}`;
    pill.textContent = `${d.emoji} ${d.label}`;
    catsRow.appendChild(pill);
  }
  widget.appendChild(catsRow);

  // Gap note
  if (gaps.length > 0) {
    const gapNote = document.createElement('div');
    gapNote.className = 'ps-gap-note';
    gapNote.textContent = `⚠️ Missing: ${gaps.map((g) => g.label).join(', ')}`;
    widget.appendChild(gapNote);
  }

  return widget;
}

function fmtINR(n) { return Number(n).toLocaleString('en-IN'); }

function bankAccentColor(bank) {
  if (!bank) return '#6366F1';
  const b = bank.toLowerCase();
  if (b.includes('hdfc'))    return '#FBBF24';
  if (b.includes('sbi'))     return '#818CF8';
  if (b.includes('axis'))    return '#6366F1';
  if (b.includes('icici'))   return '#fab387';
  if (b.includes('kotak'))   return '#FBBF24';
  if (b.includes('indusind'))return '#FB7185';
  if (b.includes('yes'))     return '#818CF8';
  if (b.includes('idfc'))    return '#818CF8';
  if (b.includes('au ') || b === 'au') return '#818CF8';
  if (b.includes('hsbc'))    return '#FB7185';
  if (b.includes('amex') || b.includes('american express')) return '#34D399';
  if (b.includes('standard chartered')) return '#34D399';
  if (b.includes('rbl'))     return '#fab387';
  return '#6366F1';
}

function bankCardGradient(bank) {
  const b = (bank || '').toLowerCase();
  if (b.includes('hdfc'))     return 'linear-gradient(145deg, #0d1f5c, #1a3380)';
  if (b.includes('sbi'))      return 'linear-gradient(145deg, #0a1e6e, #0d2a96)';
  if (b.includes('axis'))     return 'linear-gradient(145deg, #2c0060, #440090)';
  if (b.includes('icici'))    return 'linear-gradient(145deg, #7a0000, #a01020)';
  if (b.includes('kotak'))    return 'linear-gradient(145deg, #3a1800, #5a2800)';
  if (b.includes('amex') || b.includes('american express')) return 'linear-gradient(145deg, #004020, #006030)';
  if (b.includes('indusind')) return 'linear-gradient(145deg, #180040, #280060)';
  if (b.includes('idfc'))     return 'linear-gradient(145deg, #00263a, #003a56)';
  if (b.includes('yes'))      return 'linear-gradient(145deg, #001a60, #002880)';
  if (b.includes('au ') || b === 'au') return 'linear-gradient(145deg, #002240, #003660)';
  if (b.includes('hsbc'))     return 'linear-gradient(145deg, #5c0000, #7a0808)';
  if (b.includes('standard chartered')) return 'linear-gradient(145deg, #00300e, #004816)';
  if (b.includes('rbl'))      return 'linear-gradient(145deg, #400800, #600e00)';
  return 'linear-gradient(145deg, #1a1040, #26185e)';
}

function bankEmoji(bank) {
  const b = (bank || '').toLowerCase();
  if (b.includes('hdfc'))     return '🔷';
  if (b.includes('sbi'))      return '🏛️';
  if (b.includes('axis'))     return '💜';
  if (b.includes('icici'))    return '🔴';
  if (b.includes('kotak'))    return '🌟';
  if (b.includes('amex') || b.includes('american express')) return '🎩';
  if (b.includes('indusind')) return '💎';
  if (b.includes('idfc'))     return '🌊';
  if (b.includes('yes'))      return '✨';
  if (b.includes('au ') || b === 'au') return '🌅';
  if (b.includes('hsbc'))     return '🦁';
  if (b.includes('standard chartered')) return '🌿';
  if (b.includes('rbl'))      return '🔶';
  return '💳';
}

function hasAnyTrackerData(cat) {
  if (!cat) return false;
  if (cat.feeWaiverSpend > 0 && cat.annualFee > 0) return true;
  if (cat.welcomeBonus) return true;
  if (cat.fuelSurchargeWaiver) return true; // top-level fuel waiver (e.g. Amazon Pay — no benefits object)
  if (cat.benefits && (
    (cat.benefits.loungePerYear !== 0 && cat.benefits.loungePerYear !== undefined) ||
    cat.benefits.moviePerMonth > 0 ||
    cat.benefits.fuelSurchargeWaiver
  )) return true;
  return false;
}

// Sprint 2: Card detail section (Fee Waiver + Welcome Bonus + Benefits Dashboard).
function makeCardDetail(mc, cat) {
  const detail = document.createElement('div');
  detail.className = 'card-detail';

  // ── Fee Waiver Tracker ──
  if (cat.feeWaiverSpend > 0 && cat.annualFee > 0) {
    const tracked = window.CardWizCapTracker.totalTrackedSpend(waiverSpend, cat.id);
    const manual = Number(mc.feeWaiverManualSpend) || 0;
    const effective = manual > 0 ? manual : tracked;
    const target = cat.feeWaiverSpend;
    const pct = Math.min(100, Math.round(effective / target * 100));
    const fillClass = pct >= 100 ? 'tracker-fill done' : 'tracker-fill';

    const block = document.createElement('div');
    block.className = 'tracker-block';
    const remaining = Math.max(0, target - effective);
    const pctClass = pct >= 100 ? 'tracker-pct full' : pct === 0 ? 'tracker-pct zero' : 'tracker-pct';
    const remainMsg = pct >= 100 ? '✅ Fee waiver achieved!' : `₹${fmtINR(remaining)} more to spend`;
    block.innerHTML =
      `<div class="tracker-label">🏷️ Fee Waiver Tracker</div>` +
      `<div class="tracker-subtext">Spend <strong>₹${fmtINR(target)}</strong> this year → <strong>₹${fmtINR(cat.annualFee)}</strong> annual fee waived</div>` +
      `<div class="tracker-bar-row"><div class="tracker-bar"><div class="${fillClass}" style="width:${pct}%"></div></div><span class="${pctClass}">${pct}%</span></div>` +
      `<div class="tracker-remaining">${remainMsg}</div>` +
      `<div class="tracker-tracked">📍 Tracked via CardWiz: ₹${fmtINR(tracked)} (estimate only)</div>`;

    const manualRow = document.createElement('div');
    manualRow.className = 'tracker-manual-row';
    const lbl = document.createElement('label');
    lbl.textContent = CardWizI18n.t('tr_manual_hint');
    const inp = document.createElement('input');
    inp.className = 'tracker-manual-input'; inp.type = 'number';
    inp.placeholder = '₹ actual spend'; inp.value = manual > 0 ? manual : '';
    inp.addEventListener('change', () => {
      mc.feeWaiverManualSpend = Number(inp.value) || null;
      saveWallet();
      const nd = makeCardDetail(mc, cat); nd.hidden = detail.hidden;
      detail.parentNode && detail.parentNode.replaceChild(nd, detail);
    });
    manualRow.appendChild(lbl); manualRow.appendChild(inp);
    block.appendChild(manualRow);
    detail.appendChild(block);
  }

  // ── Welcome Bonus Tracker ──
  if (cat.welcomeBonus && cat.welcomeBonus.spendTarget) {
    const wb = cat.welcomeBonus;
    const tracked = window.CardWizCapTracker.totalTrackedSpend(waiverSpend, cat.id);
    const manual = Number(mc.welcomeBonusManualSpend) || 0;
    const effective = manual > 0 ? manual : tracked;
    const target = wb.spendTarget;
    const pct = Math.min(100, Math.round(effective / target * 100));
    const periodDays = wb.periodDays || 90;
    const achieved = effective >= target;

    let daysLeft = null;
    if (mc.cardAddedDate) {
      const elapsed = Math.floor((Date.now() - new Date(mc.cardAddedDate).getTime()) / 86400000);
      daysLeft = Math.max(0, periodDays - elapsed);
    }
    const expired = daysLeft !== null && daysLeft === 0 && !achieved;

    const block = document.createElement('div');
    block.className = 'tracker-block';
    let statusHtml = '';
    if (achieved) statusHtml = `<div class="tracker-status done">${escapeHtml(CardWizI18n.t('tr_bonus_done'))}</div>`;
    else if (expired) statusHtml = `<div class="tracker-status expired">${escapeHtml(CardWizI18n.t('tr_bonus_expired'))}</div>`;
    else if (daysLeft !== null) statusHtml = `<div class="tracker-days">${escapeHtml(CardWizI18n.t('tr_days_left').replace('{d}', daysLeft))}</div>`;

    const wbRemaining = Math.max(0, target - effective);
    const wbPctClass = pct >= 100 ? 'tracker-pct full' : pct === 0 ? 'tracker-pct zero' : 'tracker-pct';
    block.innerHTML =
      `<div class="tracker-label">🎁 Welcome Bonus Tracker</div>` +
      `<div class="tracker-subtext" style="font-weight:800;color:#E8ECF4;font-size:12px">${escapeHtml(wb.rewardText)}</div>` +
      `<div class="tracker-subtext">Worth <strong>₹${fmtINR(wb.estimatedValue)}</strong> · Spend <strong>₹${fmtINR(target)}</strong> in ${periodDays} days</div>` +
      statusHtml +
      `<div class="tracker-bar-row"><div class="tracker-bar"><div class="tracker-fill" style="width:${pct}%"></div></div><span class="${wbPctClass}">${pct}%</span></div>` +
      (achieved ? '' : `<div class="tracker-remaining">₹${fmtINR(wbRemaining)} more to spend</div>`) +
      `<div class="tracker-tracked">📍 Tracked via CardWiz: ₹${fmtINR(tracked)} (estimate only)</div>`;

    const manualRow = document.createElement('div');
    manualRow.className = 'tracker-manual-row';
    const lbl = document.createElement('label');
    lbl.textContent = CardWizI18n.t('tr_manual_hint');
    const inp = document.createElement('input');
    inp.className = 'tracker-manual-input'; inp.type = 'number';
    inp.placeholder = '₹ actual spend'; inp.value = manual > 0 ? manual : '';
    inp.addEventListener('change', () => {
      mc.welcomeBonusManualSpend = Number(inp.value) || null;
      saveWallet();
      const nd = makeCardDetail(mc, cat); nd.hidden = detail.hidden;
      detail.parentNode && detail.parentNode.replaceChild(nd, detail);
    });
    manualRow.appendChild(lbl); manualRow.appendChild(inp);
    block.appendChild(manualRow);
    detail.appendChild(block);
  }

  // ── Benefits Dashboard ──
  if (cat.benefits || cat.fuelSurchargeWaiver) {
    const b = cat.benefits || {};
    const hasLounge = b.loungePerYear !== 0 && b.loungePerYear !== undefined;
    const hasMovie = b.moviePerMonth > 0;
    const hasFuel = b.fuelSurchargeWaiver || cat.fuelSurchargeWaiver;

    if (hasLounge || hasMovie || hasFuel) {
      const block = document.createElement('div');
      block.className = 'tracker-block';
      const lbl = document.createElement('div');
      lbl.className = 'tracker-label';
      lbl.textContent = '✨ Card Benefits';
      block.appendChild(lbl);

      if (hasLounge) {
        const year = new Date().getFullYear();
        const key = `${cat.id}::lounge::${year}`;
        const used = benefitsUsed[key] || 0;
        const maxStr = b.loungePerYear === null ? CardWizI18n.t('tr_unlimited') : b.loungePerYear;
        const row = document.createElement('div'); row.className = 'ben-row';
        const benLbl = document.createElement('span'); benLbl.className = 'ben-label'; benLbl.textContent = CardWizI18n.t('tr_lounge');
        const cnt = document.createElement('span'); cnt.className = 'ben-count'; cnt.textContent = `${used} / ${maxStr} ${CardWizI18n.t('tr_per_year')}`;
        const plus = document.createElement('button'); plus.className = 'ben-btn'; plus.textContent = '+1';
        plus.addEventListener('click', () => {
          if (b.loungePerYear !== null && used >= b.loungePerYear) return;
          benefitsUsed[key] = used + 1; saveBenefitsUsed();
          const nd = makeCardDetail(mc, cat); nd.hidden = detail.hidden;
          detail.parentNode && detail.parentNode.replaceChild(nd, detail);
        });
        const edit = document.createElement('button'); edit.className = 'ben-btn'; edit.textContent = '✏️'; edit.title = CardWizI18n.t('tr_edit_count');
        edit.addEventListener('click', () => {
          const v = prompt(CardWizI18n.t('tr_edit_count') + ':', used); if (v === null) return;
          const n = parseInt(v, 10); if (!isNaN(n) && n >= 0) { benefitsUsed[key] = n; saveBenefitsUsed(); }
          const nd = makeCardDetail(mc, cat); nd.hidden = detail.hidden;
          detail.parentNode && detail.parentNode.replaceChild(nd, detail);
        });
        row.appendChild(benLbl); row.appendChild(cnt); row.appendChild(plus); row.appendChild(edit);
        block.appendChild(row);
      }

      if (hasMovie) {
        const period = window.CardWizCapTracker.currentPeriod(new Date());
        const key = `${cat.id}::movie::${period}`;
        const used = benefitsUsed[key] || 0;
        const row = document.createElement('div'); row.className = 'ben-row';
        const benLbl = document.createElement('span'); benLbl.className = 'ben-label'; benLbl.textContent = CardWizI18n.t('tr_movie');
        const cnt = document.createElement('span'); cnt.className = 'ben-count'; cnt.textContent = `${used} / ${b.moviePerMonth} ${CardWizI18n.t('tr_per_month')}`;
        const plus = document.createElement('button'); plus.className = 'ben-btn'; plus.textContent = '+1';
        plus.addEventListener('click', () => {
          if (used >= b.moviePerMonth) return;
          benefitsUsed[key] = used + 1; saveBenefitsUsed();
          const nd = makeCardDetail(mc, cat); nd.hidden = detail.hidden;
          detail.parentNode && detail.parentNode.replaceChild(nd, detail);
        });
        const edit = document.createElement('button'); edit.className = 'ben-btn'; edit.textContent = '✏️'; edit.title = CardWizI18n.t('tr_edit_count');
        edit.addEventListener('click', () => {
          const v = prompt(CardWizI18n.t('tr_edit_count') + ':', used); if (v === null) return;
          const n = parseInt(v, 10); if (!isNaN(n) && n >= 0) { benefitsUsed[key] = n; saveBenefitsUsed(); }
          const nd = makeCardDetail(mc, cat); nd.hidden = detail.hidden;
          detail.parentNode && detail.parentNode.replaceChild(nd, detail);
        });
        row.appendChild(benLbl); row.appendChild(cnt); row.appendChild(plus); row.appendChild(edit);
        block.appendChild(row);
      }

      if (hasFuel) {
        const fuelDiv = document.createElement('div'); fuelDiv.className = 'ben-fuel';
        fuelDiv.textContent = CardWizI18n.t('tr_fuel_badge');
        block.appendChild(fuelDiv);
      }

      detail.appendChild(block);
    }
  }

  return detail;
}

// Open Card Detail Modal (Sprint 2).
function openCardDetailModal(mc, cat) {
  const overlay = $('cardDetailModal');
  const content = $('cardDetailContent');
  if (!overlay || !content) return;
  content.innerHTML = '';

  // ── Header: cohesive dark strip (website palette) with a subtle bank-colored badge ──
  const hd = document.createElement('div');
  hd.className = 'cd-card-hd';
  const accent = bankAccentColor(cat.bank);

  const emojiEl = document.createElement('span');
  emojiEl.className = 'cd-emoji';
  emojiEl.style.background = accent + '22';   // faint bank tint (identity, not garish)
  emojiEl.style.borderColor = accent + '66';
  emojiEl.textContent = bankEmoji(cat.bank);

  const info = document.createElement('div');
  info.className = 'cd-card-info';
  const title = document.createElement('div');
  title.className = 'cd-title';
  title.textContent = mc.nickname || cat.name;
  const sub = document.createElement('div');
  sub.className = 'cd-sub';
  const feeLabel = cat.annualFee > 0 ? `₹${fmtINR(cat.annualFee)}/yr fee` : 'Lifetime Free';
  sub.textContent = cat.bank + (mc.last4 ? ` · •••• ${mc.last4}` : '') + ` · ${feeLabel}`;
  info.appendChild(title);
  info.appendChild(sub);

  const closeBtn = document.createElement('button');
  closeBtn.className = 'cd-close';
  closeBtn.textContent = '✕';
  closeBtn.addEventListener('click', () => { overlay.hidden = true; });

  hd.appendChild(emojiEl);
  hd.appendChild(info);
  hd.appendChild(closeBtn);
  content.appendChild(hd);

  // ── Tracker sections in a padded body ──
  const body = document.createElement('div');
  body.className = 'cd-body';
  body.appendChild(makeCardDetail(mc, cat));
  content.appendChild(body);

  overlay.hidden = false;
  overlay.addEventListener('click', (e) => { if (e.target === overlay) overlay.hidden = true; }, { once: false });
}

// Wallet-card row — redesigned to match bestcard visual quality.
function makeCardRow(mc, cat) {
  const row = document.createElement('div');
  row.className = 'mycard';
  row.dataset.walletId = mc.id; // edit form ko iske neeche position karne ke liye
  const accent = bankAccentColor(cat.bank);
  row.style.borderLeftColor = accent;

  // ── Top section: icon circle + card info ──
  const top = document.createElement('div');
  top.className = 'mycard-top';

  const iconCircle = document.createElement('div');
  iconCircle.className = 'mycard-icon-circle';
  iconCircle.style.background = `linear-gradient(145deg, ${accent}cc, ${accent}88)`;
  iconCircle.textContent = (cat.bank || '?')[0].toUpperCase();

  const info = document.createElement('div');
  info.className = 'mycard-info';

  const nameEl = document.createElement('div');
  nameEl.className = 'mycard-name';
  nameEl.textContent = mc.nickname || cat.name;

  const bankEl = document.createElement('div');
  bankEl.className = 'mycard-bank';
  bankEl.textContent = (mc.nickname ? cat.name : cat.bank) + (mc.last4 ? ` · •••• ${mc.last4}` : '');

  info.appendChild(nameEl);
  info.appendChild(bankEl);

  // Due date pill
  if (mc.dueDay) {
    const duePill = document.createElement('div');
    duePill.className = 'mycard-due';
    if (window.CardWizReminders) {
      const st = window.CardWizReminders.dueStatus(mc.dueDay, mc.reminderDaysBefore, new Date());
      if (st.days <= 0)     { duePill.className += ' urgent'; duePill.textContent = '🔔 Due today!'; }
      else if (st.days <= (mc.reminderDaysBefore || 3)) { duePill.className += ' soon'; duePill.textContent = `🔔 Due in ${st.days} day${st.days > 1 ? 's' : ''}`; }
      else                  { duePill.className += ' ok';     duePill.textContent = `🔔 Due ${mc.dueDay}th`; }
    } else {
      duePill.className += ' ok';
      duePill.textContent = `🔔 Due ${mc.dueDay}th`;
    }
    info.appendChild(duePill);
  }

  top.appendChild(iconCircle);
  top.appendChild(info);
  row.appendChild(top);

  // ── Action buttons ──
  const actions = document.createElement('div');
  actions.className = 'mycard-actions';

  if (hasAnyTrackerData(cat)) {
    const detBtn = document.createElement('button');
    detBtn.className = 'mc-btn-det';
    detBtn.textContent = CardWizI18n.t('tr_details');
    detBtn.addEventListener('click', () => openCardDetailModal(mc, cat));
    actions.appendChild(detBtn);
  }

  if (mc.dueDay) {
    const payBtn = document.createElement('button');
    payBtn.className = 'mc-btn-pay';
    payBtn.textContent = CardWizI18n.t('act_pay');
    payBtn.addEventListener('click', () => payNow(cat.bank));
    actions.appendChild(payBtn);
  }

  const editBtn = document.createElement('button');
  editBtn.className = 'mc-btn-edit';
  editBtn.textContent = CardWizI18n.t('act_edit');
  editBtn.addEventListener('click', () => openForm(mc.id));

  const delBtn = document.createElement('button');
  delBtn.className = 'mc-btn-del';
  delBtn.textContent = CardWizI18n.t('act_delete');
  delBtn.addEventListener('click', () => deleteCard(mc.id));

  actions.appendChild(editBtn);
  actions.appendChild(delBtn);
  row.appendChild(actions);

  return row;
}

// Debit card pe bill due/reminder fields hide (debit = no bill cycle).
function updateFormForCardType() {
  const box = $('dueDateFields');
  if (!box) return;
  const isDebit = cardTypeOf(catalogCard(els.formCardId.value)) === 'debit';
  box.hidden = isDebit;
  if (isDebit) els.formDueDay.value = ''; // saved value bhi clear
}

function openForm(editId = null) {
  // Phase 6: free tier card-limit gate (sirf naye card pe, edit pe nahi).
  if (!editId) {
    const uniqueCount = ownedUniqueIds().length;
    if (window.CardWizPremium.cardLimitReached(myCards.length, isPremium)) {
      const max = window.CardWizPremium.FREE_LIMITS.maxCards;
      els.cardsList.insertAdjacentHTML('afterend',
        `<div class="upgrade-note" id="limitNote">🔒 Free tier mein ${max} cards tak. Unlimited ke liye Premium.
         <button id="limitUpgrade">⭐ 1st mahina FREE — Premium on karo</button></div>`);
      const b = $('limitUpgrade');
      if (b) b.addEventListener('click', () => { switchView('more'); const n = $('limitNote'); if (n) n.remove(); });
      void uniqueCount;
      return;
    }
  }
  editingId = editId;
  els.formErr.textContent = '';
  if (editId) {
    const mc = myCards.find((c) => c.id === editId);
    els.formCardId.value = mc.cardId;
    els.formNickname.value = mc.nickname || '';
    els.formLast4.value = mc.last4 || '';
    els.formDueDay.value = mc.dueDay || '';
    els.formRemindBefore.value = mc.reminderDaysBefore != null ? mc.reminderDaysBefore : 3;
    els.saveCardBtn.textContent = 'Update';
  } else {
    els.formNickname.value = '';
    els.formLast4.value = '';
    els.formDueDay.value = '';
    els.formRemindBefore.value = 3;
    els.saveCardBtn.textContent = 'Save';
  }
  updateFormForCardType(); // debit -> bill due fields hide
  els.cardForm.hidden = false;
  els.addCardBtn.hidden = true;
  positionCardForm(); // edited card ke row ke neeche kholo (ya add-new default)
}

function closeForm() {
  els.cardForm.hidden = true;
  els.addCardBtn.hidden = false;
  editingId = null;
  positionCardForm(); // wapas default position pe
}

function saveCard() {
  const cardId = els.formCardId.value;
  const nickname = els.formNickname.value.trim();
  const last4 = els.formLast4.value.trim();
  const dueDayRaw = els.formDueDay.value.trim();
  const remindRaw = els.formRemindBefore.value.trim();

  // Validation: last4 optional, par agar diya to exactly 4 digits.
  if (last4 && !/^\d{4}$/.test(last4)) {
    els.formErr.textContent = 'Last 4 digits exactly 4 ank hone chahiye (ya khaali chhodo).';
    return;
  }
  // dueDay optional, par agar diya to 1-31.
  let dueDay = null;
  if (dueDayRaw) {
    const d = parseInt(dueDayRaw, 10);
    if (isNaN(d) || d < 1 || d > 31) {
      els.formErr.textContent = CardWizI18n.t('pop_due_range');
      return;
    }
    dueDay = d;
  }
  let reminderDaysBefore = 3;
  if (remindRaw) {
    const r = parseInt(remindRaw, 10);
    if (!isNaN(r) && r >= 0 && r <= 15) reminderDaysBefore = r;
  }

  // Debit card pe bill due nahi — force null (defense, fields hidden hote hi hain).
  if (cardTypeOf(catalogCard(cardId)) === 'debit') dueDay = null;
  const now = new Date();
  const fields = { cardId, nickname, last4, dueDay, reminderDaysBefore, updatedAt: now.toISOString() };
  if (editingId) {
    const mc = myCards.find((c) => c.id === editingId);
    Object.assign(mc, fields);
  } else {
    const cardAddedDate = now.toISOString().slice(0, 10);
    const feeWaiverStartMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
    myCards.push({ id: uid(), ...fields, cardAddedDate, feeWaiverStartMonth });
  }
  cardsTab = cardTypeOf(catalogCard(cardId)); // added/edited card ke tab pe switch
  saveWallet();
  pushIfSyncing(); // Phase 10: cloud update
  closeForm();
  renderMyCards();
}

function deleteCard(id) {
  if (!confirm('Yeh card hata dein?')) return;
  myCards = myCards.filter((c) => c.id !== id);
  saveWallet();
  pushIfSyncing(); // Phase 10: cloud update
  renderMyCards();
}

// ---------- Bills dashboard (Phase 4) ----------
const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

function renderBills() {
  els.billsList.innerHTML = '';
  const withDue = myCards.filter((c) => c.dueDay);

  if (withDue.length === 0) {
    els.billsList.innerHTML =
      '<div class="empty">Kisi card pe due date set nahi.<br>"💼 Cards" mein card edit karke due date daalo.</div>';
    return;
  }

  const today = new Date();
  const R = window.CardWizReminders;

  // Sabse pehle jo due ho, woh upar.
  const rows = withDue
    .map((mc) => ({ mc, status: R.dueStatus(mc.dueDay, mc.reminderDaysBefore, today) }))
    .sort((a, b) => a.status.days - b.status.days);

  for (const { mc, status } of rows) {
    const cat = catalogCard(mc.cardId);
    if (!cat) continue;
    const name = mc.nickname || cat.name;

    const row = document.createElement('div');
    row.className = `bill-row ${status.level}`;

    const left = document.createElement('div');
    const bname = document.createElement('div');
    bname.className = 'bname';
    bname.textContent = name;
    const bmeta = document.createElement('div');
    bmeta.className = 'bmeta';
    const dueStr = `${status.due.getDate()} ${MONTHS[status.due.getMonth()]}`;
    bmeta.textContent = `Due ${dueStr}${mc.last4 ? ' · •••• ' + mc.last4 : ''}`;
    left.appendChild(bname);
    left.appendChild(bmeta);

    const right = document.createElement('div');
    right.className = 'bill-right';
    const bdays = document.createElement('div');
    bdays.className = 'bdays';
    bdays.textContent = status.days <= 0 ? 'Aaj due!' : status.days === 1 ? 'Kal due' : `${status.days} din`;
    const pay = document.createElement('button');
    pay.className = 'pay';
    pay.textContent = 'Pay Now ↗';
    pay.addEventListener('click', () => payNow(cat.bank));
    right.appendChild(bdays);
    right.appendChild(pay);

    row.appendChild(left);
    row.appendChild(right);
    els.billsList.appendChild(row);
  }
}

// Hum payment NAHI karte — bank/CRED ka bill-pay page kholte hain.
function payNow(bank) {
  const url = BANK_PAY_URLS[bank] || CRED_URL;
  window.open(url, '_blank', 'noopener');
}

// ---------- Recommendation ----------
function ownedUniqueIds() {
  return [...new Set(myCards.map((c) => c.cardId))];
}

function runRecommendation() {
  const category = els.category.value;
  const amount = Number(els.amount.value) || 0;
  const opts = { category, amount };

  if (els.onlyMine.checked) {
    const owned = ownedUniqueIds();
    if (owned.length === 0) {
      els.results.innerHTML =
        `<div class="empty">${escapeHtml(CardWizI18n.t('sg_add_first'))}</div>`;
      els.capsFoot.hidden = true;
      return;
    }
    opts.ownedCardIds = owned;
  }

  // Phase 5: cap-aware ranking — used caps factor karo.
  opts.getRemaining = window.CardWizCapTracker.makeGetRemaining(capUsage, new Date());

  const ranked = window.CardWizEngine.recommend(DB, opts);
  lastRanked = ranked;
  renderResults(ranked);

  // Caps footer: current period + reset.
  els.capsPeriod.textContent = `📅 Caps period: ${capUsage.period}`;
  els.capsFoot.hidden = false;
}

// "✓ Use kiya" — top card ka reward log karo + cumulative spend track karo.
function logUsageFor(result, spendAmount) {
  if (!result || !result.rule || result.savings <= 0) return;
  capUsage = window.CardWizCapTracker.logUsage(capUsage, result.id, result.rule, result.savings, new Date());
  saveCapUsage();
  if (spendAmount > 0) {
    waiverSpend = window.CardWizCapTracker.addTrackedSpend(waiverSpend, result.id, spendAmount);
    saveWaiverSpend();
  }
  runRecommendation(); // re-rank with updated caps
}

// myCards mein is cardId ka nickname (agar ho) — results mein dikhane ke liye.
function nicknameFor(cardId) {
  const mc = myCards.find((c) => c.cardId === cardId && c.nickname);
  return mc ? mc.nickname : null;
}

function renderResults(ranked) {
  els.results.innerHTML = '';

  // Show/hide toggle row and reset to expanded on every new result set
  const toggleRow = $('resultsToggle');
  const toggleLabel = $('resultsToggleLabel');
  const toggleBtn = $('resultsToggleBtn');
  const hasResults = ranked.length > 0;
  if (toggleRow) toggleRow.hidden = !hasResults;
  if (hasResults) {
    els.results.hidden = false;
    if (toggleLabel) toggleLabel.textContent = CardWizI18n.t('results_count').replace('{n}', ranked.length);
    if (toggleBtn) toggleBtn.textContent = CardWizI18n.t('results_hide');
  }

  if (ranked.length === 0) {
    els.results.innerHTML = `<div class="empty">${escapeHtml(CardWizI18n.t('sg_no_card'))}</div>`;
    return;
  }

  const ownedSet = new Set(ownedUniqueIds());

  ranked.forEach((r, i) => {
    const row = document.createElement('div');
    row.className = 'card-row';
    if (r.savings <= 0) row.classList.add('zero');
    else if (i === 0) row.classList.add('best');
    if (r.capExhausted) row.classList.add('exhausted');

    const left = document.createElement('div');
    const name = document.createElement('div');
    name.className = 'name';
    const nick = nicknameFor(r.id);
    const star = i === 0 && r.savings > 0 ? '⭐ ' : '';
    name.textContent = star + (nick ? `${nick}` : r.name);
    // Debit card ho to chhota DEBIT tag (payment ke time clarity ke liye).
    if (cardTypeOf(catalogCard(r.id)) === 'debit') {
      const tag = document.createElement('span');
      tag.className = 'type-tag';
      tag.textContent = 'DEBIT';
      name.appendChild(tag);
    }
    const sub = document.createElement('div');
    sub.className = 'sub';
    sub.textContent = r.excluded ? CardWizI18n.t('sg_no_reward') : (nick ? r.name : r.note);
    left.appendChild(name);
    left.appendChild(sub);

    // Top card: owned -> "✓ Use kiya" (cap log); not owned -> "Apply" (referral).
    if (i === 0 && r.savings > 0 && !r.excluded) {
      if (ownedSet.has(r.id)) {
        const logBtn = document.createElement('button');
        logBtn.className = 'log-btn';
        logBtn.textContent = CardWizI18n.t('sg_used');
        logBtn.addEventListener('click', () => logUsageFor(r, Number(els.amount.value)));
        left.appendChild(logBtn);
      } else {
        const applyBtn = document.createElement('button');
        applyBtn.className = 'apply-btn';
        applyBtn.textContent = CardWizI18n.t('act_apply_this');
        applyBtn.addEventListener('click', () => openApply({ id: r.id, name: r.name }));
        left.appendChild(applyBtn);
      }

      // "Why this card" — savings gap vs next best
      if (ranked.length > 1) {
        const diff = r.savings - ranked[1].savings;
        if (diff > 0) {
          const whyEl = document.createElement('div');
          whyEl.className = 'why-cmp';
          whyEl.textContent = CardWizI18n.t('why_extra').replace('{d}', diff);
          left.appendChild(whyEl);
        }
      }
      // Comparison row — other top cards' savings in a compact line
      if (ranked.length > 1 && r.savings > 0) {
        const others = ranked.slice(1, 3).filter((x) => x.savings > 0);
        if (others.length) {
          const parts = others.map((x) => `${x.name.split(' ').slice(0, 2).join(' ')} ₹${x.savings}`);
          const othEl = document.createElement('div');
          othEl.className = 'why-others';
          othEl.textContent = CardWizI18n.t('why_vs_others').replace('{others}', parts.join(' · '));
          left.appendChild(othEl);
        }
      }
    }

    const right = document.createElement('div');
    const save = document.createElement('div');
    save.className = 'save';
    let badge = '';
    if (r.capExhausted) badge = '<span class="badge khatam">' + CardWizI18n.t('pop_cap_khatam') + '</span>';
    else if (r.capped) badge = '<span class="badge">cap</span>';
    save.innerHTML = r.savings > 0 ? `₹${r.savings}${badge}` : '—';
    const rate = document.createElement('div');
    rate.className = 'rate';
    rate.textContent = r.savings > 0 ? `${r.rate}% ${CardWizI18n.t('sg_reward')}` : '';
    right.appendChild(save);
    right.appendChild(rate);

    row.appendChild(left);
    row.appendChild(right);
    els.results.appendChild(row);
  });
}

// ---------- Referral / Sponsored (Phase 6.5 monetization) ----------
function openApply(card) {
  if (typeof CardWizReferral === 'undefined') return;
  const url = CardWizReferral.getApplyUrl(card);
  if (url) window.open(url, '_blank', 'noopener');
}

// Sponsored card — sirf FREE users ko (premium = ad-free). Catalog mein na ho to hide.
function renderFeatured() {
  const box = $('featuredBox');
  if (!box) return;
  const feat = (typeof CardWizReferral !== 'undefined') ? CardWizReferral.getFeatured() : null;
  const cat = feat ? catalogCard(feat.cardId) : null;
  if (isPremium || !feat || !cat) { box.hidden = true; box.innerHTML = ''; return; }

  box.hidden = false;
  box.innerHTML =
    `<div class="featured">
       <span class="spon-badge">SPONSORED</span>
       <div class="featured-name">${escapeHtml(cat.name)}</div>
       <div class="featured-blurb">${escapeHtml(feat.blurb)}</div>
       <button class="featured-apply" id="featuredApply">Apply ↗</button>
       <div class="featured-note">Referral — apply/approve pe hame commission, aapko extra cost nahi.</div>
     </div>`;
  const b = $('featuredApply');
  if (b) b.addEventListener('click', () => {
    const url = CardWizReferral.getFeaturedApplyUrl({ id: feat.cardId, name: cat.name });
    if (url) window.open(url, '_blank', 'noopener');
  });
}

// ---------- Best Cards (Tab 1) ----------
function renderBestCards() {
  const list = $('bestCardsList');
  if (!list || typeof CardWizBestCards === 'undefined') return;
  const { BEST_CARDS, TIER_META, BADGE_ICONS } = CardWizBestCards;

  document.querySelectorAll('#bestFilter button').forEach((b) =>
    b.classList.toggle('active', b.dataset.tier === bestTier));

  const cards = BEST_CARDS.filter((c) => bestTier === 'all' || c.tier === bestTier);

  list.innerHTML = '';
  for (const card of cards) {
    const tm = TIER_META[card.tier] || {};
    const el = document.createElement('div');
    el.className = `bestcard lvl-${card.tier}`;
    el.innerHTML =
      `<div class="bc-name">${escapeHtml(card.name)} <span class="bc-tier-icon" title="${escapeHtml(tm.label || '')}">${tm.icon}</span></div>
       <div class="bc-badges">${card.badges.map((bd) => `<span class="bc-badge">${(BADGE_ICONS[bd] || '🏷️')} ${escapeHtml(CardWizI18n.tBadge(bd))}</span>`).join('')}</div>
       <div class="bc-actions">
         <button class="bc-info">${escapeHtml(CardWizI18n.t('act_info'))}</button>
         <button class="bc-apply">${escapeHtml(CardWizI18n.t('act_apply'))}</button>
       </div>`;
    el.querySelector('.bc-info').addEventListener('click', () => openCardInfo(card));
    el.querySelector('.bc-apply').addEventListener('click', () => openApply({ id: card.cardId, name: card.name }));
    list.appendChild(el);
  }

  const disc = $('bestDisclosure');
  if (disc) disc.textContent = (typeof CardWizReferral !== 'undefined') ? CardWizReferral.DISCLOSURE : '';
}

// Card content language ke hisaab se (bestcards-i18n.js); missing -> English base.
function cardField(card, field) {
  const lang = CardWizI18n.getLang();
  const all = (typeof CardWizBestCardsI18n !== 'undefined') && CardWizBestCardsI18n.BEST_CARDS_I18N;
  const tr = all && all[card.cardId];
  if (tr && tr[lang] && tr[lang][field] != null) return tr[lang][field];
  return card[field]; // English base (bestcards.js). Card NAME kabhi translate nahi.
}

// Card info modal — features / pros / cons / useful-for + Apply (andar bhi).
function openCardInfo(card) {
  const modal = $('cardInfoModal');
  const box = $('cardInfoBox');
  if (!modal || !box) return;
  const tm = (CardWizBestCards.TIER_META[card.tier]) || {};
  const li = (arr) => (arr || []).map((x) => `<li>${escapeHtml(x)}</li>`).join('');
  box.innerHTML =
    `<div class="m-hd">
       <div class="m-name">${escapeHtml(card.name)} <span class="bc-tier-icon" title="${escapeHtml(tm.label || '')}">${tm.icon}</span></div>
       <button class="m-x" id="cardInfoClose">✕</button>
     </div>
     <div class="m-sec feat"><h4>${escapeHtml(CardWizI18n.t('md_features'))}</h4><ul>${li(cardField(card, 'features'))}</ul></div>
     <div class="m-sec pros"><h4>${escapeHtml(CardWizI18n.t('md_pros'))}</h4><ul>${li(cardField(card, 'pros'))}</ul></div>
     <div class="m-sec cons"><h4>${escapeHtml(CardWizI18n.t('md_cons'))}</h4><ul>${li(cardField(card, 'cons'))}</ul></div>
     <div class="m-sec use"><h4>${escapeHtml(CardWizI18n.t('md_useful'))}</h4><div class="m-use">${escapeHtml(cardField(card, 'usefulFor') || '')}</div></div>
     <button class="m-apply" id="cardInfoApply">${escapeHtml(CardWizI18n.t('act_apply_this'))}</button>
     <div class="m-disc">${(typeof CardWizReferral !== 'undefined') ? escapeHtml(CardWizReferral.DISCLOSURE) : ''}</div>`;
  $('cardInfoClose').addEventListener('click', closeCardInfo);
  $('cardInfoApply').addEventListener('click', () => openApply({ id: card.cardId, name: card.name }));
  modal.hidden = false;
  // Background scroll lock — html + body dono (popup scroll html pe hota hai).
  document.documentElement.style.overflow = 'hidden';
  document.body.style.overflow = 'hidden';
}

function closeCardInfo() {
  const modal = $('cardInfoModal');
  if (modal) modal.hidden = true;
  document.documentElement.style.overflow = '';
  document.body.style.overflow = '';
}

// ---------- CIBIL score checker (affiliate redirect) ----------
// ⚠️ TODO: Replace with your Paisabazaar affiliate deep link once sign-up is done.
//    Affiliate program: https://www.paisabazaar.com/affiliate
const CIBIL_PARTNER_URL = 'https://www.paisabazaar.com/credit-score/';

function openCibil() {
  window.open(CIBIL_PARTNER_URL, '_blank', 'noopener');
  const note = $('cibilNote');
  if (note) note.textContent = CardWizI18n.t('cb_redirect');
}

// ---------- Language (English / Hinglish / Hindi) ----------
function syncLangButtons() {
  const code = CardWizI18n.getLang();
  document.querySelectorAll('#langBtns button').forEach((b) =>
    b.classList.toggle('active', b.dataset.lang === code));
}

// Extension icon ka hover tooltip (action title) — selected language mein.
function applyExtTitle() {
  try {
    if (typeof chrome !== 'undefined' && chrome.action && chrome.action.setTitle) {
      chrome.action.setTitle({ title: CardWizI18n.t('ext_title') });
    }
  } catch (_) { /* ignore */ }
}

function setLanguage(code) {
  CardWizI18n.saveLang(code);
  CardWizI18n.applyStaticI18n();      // static [data-i18n] strings
  syncLangButtons();
  applyExtTitle();                    // icon tooltip
  renderBestCards();                  // dynamic (JS-generated) strings
  renderMyCards();
  renderMore();                       // account/sync/premium/analytics dynamic strings
}

init();
