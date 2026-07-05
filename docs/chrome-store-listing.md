# CardWiz — Chrome Web Store Submission Kit

Copy-paste into the Developer Dashboard fields. Everything below reflects what the
extension actually does (accuracy matters — the Privacy tab is a signed certification).

---

## Store listing

**Item name**
CardWiz — Best Card & Bill Reminders

**Short description** (≤ 132 chars)
At checkout, CardWiz shows which of your cards earns the most rewards + live bank offers. Plus bill due-date reminders. India-first.

**Category:** Shopping
**Language:** English (India)

**Detailed description**
CardWiz tells you which credit or debit card to use at checkout so you never leave rewards on the table — built for India.

WHAT IT DOES
• Best card at checkout — on Amazon, Flipkart, Myntra, Ajio, Nykaa, Swiggy, Zomato and more, a small panel shows which of YOUR cards gives the most cashback/reward on that exact amount, and surfaces the live bank offer on the page.
• Compare 195+ Indian cards — a curated "Top Cards" list scored by real value, plus a Suggest tool: pick a category and amount, get the best card instantly.
• Your card wallet — add your cards by bank + last 4 digits only. We NEVER ask for or store the full card number or CVV.
• Bill reminders — get a notification before your card's due date so you never miss a payment.
• Free credit score, AI suggestions, and more.

PRIVACY-FIRST
Your cards stay on your device. Optional Google sign-in only backs up card metadata (bank, type, last 4, due date) to your own account so it syncs across devices — never the full number or CVV. We don't sell your data.

Free to use. CardWiz earns a small affiliate commission on some "Apply" links, at no extra cost to you.

**Single purpose** (required field)
CardWiz helps the user choose the credit or debit card that earns the most rewards at checkout, and reminds them of card bill due dates.

---

## Permission justifications
(one box per permission in the "Privacy practices" tab)

**storage**
Stores the user's saved cards (issuer, card type, last 4 digits, due date) and preferences locally on the device via chrome.storage.

**alarms**
Runs a periodic (twice-daily) background check to fire card bill-due-date reminders on time.

**notifications**
Shows the bill due-date reminders (and, if enabled, saved-offer alerts) as Chrome notifications.

**identity**
Optional Google Sign-In (chrome.identity) so a user can back up and sync their saved card list across their own devices. Sign-in is not required to use the core features.

**Host permission — https://cardwiz-backend.onrender.com/***
CardWiz's own backend: fetches the card catalog, and (only when signed in) syncs the user's card list and returns account/plan info.

**Content scripts / host access on the shopping sites**
(amazon.in, flipkart.com, myntra.com, ajio.com, nykaa.com, meesho.com, tatacliq.com, swiggy.com, zomato.com, bigbasket.com, blinkit.com, zeptonow.com, makemytrip.com, cleartrip.com, irctc.co.in, bookmyshow.com, district.in)
On these specific checkout/cart pages, the extension reads the payable amount and any visible bank-offer text to compute which of the user's cards saves the most and display it. This runs locally in the page; the page content is not stored or sent to our servers.

**Remote code:** None. All JavaScript is bundled in the package; nothing is fetched and executed at runtime.

---

## Data-use disclosures (Privacy practices tab)

Data collected / used:
- **Financial & payment info** — card metadata only: issuer/bank, card type, last 4 digits, bill due date. NO full card number, NO CVV, NO expiry. Used solely to recommend the best card and send bill reminders. Stored locally; optionally synced to the user's own account if signed in.
- **Personally identifiable info / Authentication info** — only if the user chooses Google Sign-In: name, email, profile picture and a session token, used to provide the optional cloud-sync/account feature.
- **Website content** — the payable amount and visible bank-offer text on a checkout page are read to compute the recommendation. Processed locally and ephemerally; not stored or transmitted.

Certifications (all true for CardWiz — check each):
- ☑ I do NOT sell or transfer user data to third parties outside the approved use cases.
- ☑ I do NOT use or transfer user data for purposes unrelated to the item's single purpose.
- ☑ I do NOT use or transfer user data to determine creditworthiness or for lending purposes.

**Privacy policy URL:** https://cardwiz.in/privacy

---

## Screenshots to capture (1280×800, ≥ 1, up to 5)
1. The checkout panel on an Amazon/Flipkart cart — best card + bank offer highlighted.
2. Popup "Top Cards" list.
3. Popup "My Cards" (with the bank logos + a due-date reminder chip).
4. Popup "Suggest" — category + amount → ranked result.
5. (Optional) the bill-reminder notification.

Store icon: the 128px icon is already in the package.

---

## After it's published (you get an extension ID)
1. Backend env: set **ALLOWED_EXTENSION_IDS** to the published ID (so the backend accepts the extension's requests).
2. Website `lib/constants.ts`: set **EXTENSION_PUBLISHED = true** and **CHROME_STORE_URL** to the real listing URL → the "Install" CTAs then point to the store.
3. Optional: set a real sponsor (or null) for FEATURED / real APPLY_URLS in `cardreferral.js`.
