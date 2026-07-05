# CardWiz — Launch-Day Manual QA Checklist

Walk this end-to-end on an **unpacked build** in Chrome (`chrome://extensions` → Load unpacked).
Log every failure as: `area · what · file:line · repro · expected vs actual`.
Automated logic is covered by `npm test` (209 tests) — this doc covers what a unit test can't:
real DOM, real Google login, real 17 merchant checkouts, and the service worker.

Legend: `[ ]` to test · **⚠️** known-risk / likely-fail · **(P0)** launch-blocker.

---

## 0. Pre-flight (P0)
- [ ] **(P0)** Run `node prelaunch-check.js` — must be **all green** on the build you upload
      (flips: `CATALOG_USE_LOCAL`, `USE_LOCAL_BACKEND`, `CW_DEBUG_ALL`, `CW_DEBUG` → false;
      remove `localhost` host-permission; real `homepage_url`).
- [ ] **(P0)** `npm test` green (209).
- [ ] **(P0)** Manually verify (not in the script): `cardreferral.js` `FEATURED`/`APPLY_URLS`/`REFERRAL_CONFIG`
      are real or null; `background.js:14` BACKEND url intended; `website/lib/constants.ts` `EXTENSION_PUBLISHED=true`;
      backend `ALLOWED_EXTENSION_IDS` set to the published id.
- [ ] Popup opens **instantly** with the backend OFF (local-first): Top Cards render from bundled catalog.
- [ ] Console has **no errors** on popup open and on a merchant checkout page.

---

## B1 · Popup flows

### Onboarding (first-run spotlight tour)
- [ ] Fresh install (or `chrome.storage.local.remove('cwOnboardedV1')` then reopen) → tour auto-shows **after** cards render.
- [ ] 4 steps: each **switches to that tab** + spotlights the nav button with a ring + arrow.
- [ ] Back / Next / Skip work; dots track; last step button says "Got it".
- [ ] "Got it" and Skip both **return to the Top Cards tab**.
- [ ] Header **"?"** replays the tour anytime (does not reset the once-only flag).
- [ ] Reopen popup after finishing → tour does **not** auto-show again.
- [ ] Repeat in **Hinglish** and **Hindi** (switch language, replay via "?") — copy is translated.
- [ ] Reduced-motion OS setting → tour still usable (ring jumps instead of sliding).
- [ ] Narrow/short window → tooltip clamps on-screen, arrow still points at the tab.

### My Cards (wallet CRUD)
- [ ] Add a **credit** card: pick from dropdown, nickname, last4, due day, reminder days → saves + row appears.
- [ ] Add a **debit** card (Debit tab) → due-date fields hidden; saves.
- [ ] Validation: last4 accepts **digits only** (paste "12ab34" → "1234"); saving 1–3 digits → error;
      due day outside 1–31 → error; reminder outside 0–15 → silently defaults to 3; nickname capped at 30.
- [ ] Edit a card → form pre-fills, repositions under the row, saves.
- [ ] Delete a card → native confirm → row removed.
- [ ] **3-card free limit**: add 3 → "Add" shows the upgrade banner; **duplicates count** toward the limit.
- [ ] Portfolio-score widget shows for a non-empty wallet (score/strengths/gaps/suggestions); **no crash**
      even for a card whose catalog entry lacks reward rules (regression: portfolioscore.js c.rules guard).
- [ ] A saved card whose catalog entry was removed → row is skipped, no error.

### Suggest (recommendation)
- [ ] Category × amount → best card list; change category → list updates.
- [ ] Amount edge: `0`/blank → handled; negative/huge → no crash.
- [ ] "Only my cards" with an **empty wallet** → shows `sg_add_first`, caps footer hidden.
- [ ] Results collapse/expand toggle; caps footer + "Caps reset" (native confirm).
- [ ] Featured/sponsored box shows for **free** users only (hidden when premium).
- [ ] AI teaser → opens `cardwiz.in/ai`; quiz teaser → `cardwiz.in/find-my-card`.
- [ ] **⚠️** After results render, switching language does NOT re-run the recommendation → rows stay in the old language (known).

### Top Cards
- [ ] Elite / Premium / Solid filter switches the list; a tier with 0 matches → empty (no crash).
- [ ] Info modal opens, locks background scroll, restores on close (X or overlay click).
- [ ] Apply opens a working URL (best-cards Apply uses the referral module — always resolves).

### More
- [ ] **Google sign-in** → avatar + plan pill (FREE/PREMIUM/PRO) + Sign out; **sign-out** returns to signed-out UI.
- [ ] Cloud-sync toggle: signed-out → shows sign-in prompt, no network; signed-in → ON pulls/pushes cards.
- [ ] Premium status renders; **dev toggle only when signed-out** (flips local isPremium); signed-in free → "Upgrade" → pricing.
- [ ] Watchlist (signed-in) + Spending Analytics (premium-gated: locked note for free, summary for premium).
- [ ] Version string shows; privacy link works.
- [ ] Language switch (en/hinglish/hi) updates static + dynamic strings. **⚠️** Known non-i18n strings stay fixed:
      category labels, caps-period label, last4 error, delete/reset confirms, AI-teaser copy, featured copy, limit-note.

### Modals
- [ ] Card-info modal: scroll lock + restore.
- [ ] Card-detail trackers (fee-waiver / welcome-bonus / benefits): `prompt()` edits work; cancel = no-op.
- [ ] **⚠️** Card-detail modal does not lock background scroll (info modal does) — verify acceptable.

### Cross-cutting
- [ ] `user-select:none`: cannot select/copy card names, disclosures, notes; **inputs still selectable/typable**.
- [ ] Backend offline → popup still opens instantly; signing-in state resolves in the background when it comes back.

---

## B2 · On-site checkout widget — 17 merchants

For **each** merchant, sweep the states and checks below. The 4 merchants with real selectors
(**Amazon, Flipkart, Myntra, Ajio**) + **Nykaa** are the priority; the rest rely on a generic label
scan and several are expected to under-perform — **log honestly**.

### States (per merchant)
- [ ] Product page → widget should **not** show (unless checkout-ish).
- [ ] Cart page → widget shows if URL/path is checkout-ish.
- [ ] Checkout / payment page → widget shows.
- [ ] Empty cart → no bogus offer/amount.
- [ ] Logged-out → estimated rewards only (no card-specific offers).
- [ ] SPA navigation between pages → widget updates; **no stale offer from the previous page**
      (regression: `content-detect.js` `pageActualCache`/`frameOffers` on nav).

### Per-page checks
- [ ] Correct **payable** amount (not MRP / not subtotal).
- [ ] Correct best card for the category.
- [ ] Bank offer attributed to the **right saved card** (bank + last4), **never over-credited**.
- [ ] Minimize-to-chip (✕) → chip; click chip → widget back.
- [ ] Drag the widget → position persists within the tab (sessionStorage).
- [ ] Auto-positions opposite the order-summary; **off-screen clamp** on window resize/zoom.
- [ ] Premium user → sponsored/blur behavior correct.
- [ ] Language en/hinglish/hi renders in the widget.

### Merchant matrix
| # | Merchant | Selector basis | Watch for |
|---|---|---|---|
| 1 | Amazon.in | hard element IDs | payable vs MRP; `Bank Offer Discount` exact line |
| 2 | Flipkart | obfuscated classes | multi-bank offer (Axis/ICICI) must **drop**, not phantom-credit |
| 3 | Myntra | `grandTotal` | payable (removed the `pdp-price` MRP selector) |
| 4 | Ajio | path `/pay` (+ `payment.services.ajio.com`) | AU/HSBC offers |
| 5 | Nykaa | generic label scan | amount + offer detection |
| 6 | **⚠️** Swiggy | generic | **SPA-modal cart, no URL change → widget may never show** |
| 7 | **⚠️** Zomato | generic | **SPA-modal cart** |
| 8 | **⚠️** Blinkit | generic | **SPA-modal cart** |
| 9 | **⚠️** Zepto | generic | **SPA-modal cart** |
| 10 | **⚠️** Meesho | generic | **SPA-modal cart** |
| 11 | TataCliq | generic | amount detection |
| 12 | MakeMyTrip | generic | travel amount / passenger totals |
| 13 | Cleartrip | generic | travel amount |
| 14 | IRCTC | `booking/payment` paths | payment page detection |
| 15 | **⚠️** BookMyShow | `buytickets/offers-listing` | **SPA-modal seat/pay flow** |
| 16 | **⚠️** District | generic | **SPA-modal (Zomato events app)** |
| 17 | Amazon subdomains / smile | isDomain allows subdomains | still detects Amazon |

### Offer-state cases (inject / observe on Amazon or Flipkart)
- [ ] No offers → estimated rewards only.
- [ ] Single-bank offer → attributed to the matching saved card.
- [ ] Multi-bank offer text → **dropped** (no phantom credit).
- [ ] EMI-only offer → **skipped**.
- [ ] Debit-only offer → **skipped** for a credit card.
- [ ] Min-spend gated (amount < min) → offer value 0.
- [ ] Percent + cap → capped correctly; flat → flat value.
- [ ] Two saved cards sharing a last4 → both credited (same offer) — verify acceptable.
- [ ] Mangled concatenated text ("500.0010% off") → no absurd value.
- [ ] **⚠️ Security:** an ad/other iframe with `origin: null` posting a fake `{amt, ctx}` → verify the widget
      does not fabricate an offer for your last4 (content-detect.js:1113-1123 accepts `origin==='null'`).

### Amount-format cases (parseRupee)
- [ ] `₹1,23,456` → 123456 · `Rs. 1,299` · `INR 500` · `₹1,299.50` (decimals).
- [ ] `-₹2,000` discount line → magnitude used (sign ignored — verify OK for offer lines, not for payable).
- [ ] `₹0` / `Free` / no number → widget falls back to %-mode (no bogus amount).
- [ ] MRP `₹3,995` vs payable `₹1,422` → offer computes on **payable**.

---

## B3 · Service worker / background (background.js)
Not unit-tested (service-worker globals). Test live:
- [ ] Add a card due **today** → bill notification fires. (Force: `chrome://extensions` → service worker →
      run `chrome.alarms.create('scs-daily-bill-check',{delayInMinutes:0.1})`, or trigger `checkBills` via the SW console.)
- [ ] Same card, same day → **only one** notification (dedupe via `notifiedOn`).
- [ ] Click the notification → it clears.
- [ ] Delete the card → its `notifiedOn` entry is garbage-collected (no ghost notifications).
- [ ] Card due `soon`/`ok` → no premature notification.
- [ ] Signed-in offer notifications: `/watchlist/notifications` → unread items create notifications, then marked read.
- [ ] Extension icon tooltip is in the selected language; changing `cwLang` updates it.

---

## Confirmed findings to re-verify after any fix (from code review)
- [ ] **portfolioscore c.rules** — FIXED (guarded); test covers it. Re-verify My Cards widget with a rules-less card.
- [ ] **inrApply unencoded URL** — latent; no CPA target has a query string today (test guards it). Encode before adding one that does.
- [ ] **bestcards vs affiliate bank names** (`AU Bank`/`Federal`) — latent; Apply uses catalog bank / referral fallback. Don't pipe bestcards bank into `cardApplyUrl`.
- [ ] **SPA-modal carts** (7 merchants) — decide: fix `isCheckoutish`/modal detection or scope out at launch.
- [ ] **pageActualCache/frameOffers on SPA nav** — clear on nav to prevent stale offers.
- [ ] **iframe origin=null** — tighten `postMessage` origin check.
- [ ] **renderBills dead code** (popup-smartcard.js:1292) — remove/guard (`#billsList` no longer exists).
