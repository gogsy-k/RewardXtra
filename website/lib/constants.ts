/*
 * Site-wide constants — single source of truth.
 *
 * CHROME WEB STORE: submitted for review (item id cfjgbjaaooalbpmmijiodfippkdpfbpn).
 * The real store URL is already set below. GO LIVE the moment it's approved by
 * flipping ONE line:  EXTENSION_PUBLISHED → true  (then commit + push).
 * Until then all "Add to Chrome" buttons go to the launch-notify (mailto) — no
 * dead store link.
 */
export const EXTENSION_PUBLISHED = false;

// Real store URL (item-id path redirects to the canonical slug URL once live).
export const CHROME_STORE_URL =
  "https://chromewebstore.google.com/detail/cfjgbjaaooalbpmmijiodfippkdpfbpn";

export const NOTIFY_EMAIL = "gurpreetsj8871@gmail.com";

const NOTIFY_LAUNCH_HREF = `mailto:${NOTIFY_EMAIL}?subject=${encodeURIComponent(
  "CardWiz extension — launch pe notify karo",
)}&body=${encodeURIComponent(
  "Mujhe CardWiz Chrome extension launch hone par email bhej dena. Dhanyavaad!",
)}`;

/** Har "Add to Chrome" button yahin point kare. */
export const INSTALL_HREF = EXTENSION_PUBLISHED ? CHROME_STORE_URL : NOTIFY_LAUNCH_HREF;

/** Install button ka label i18n key — publish-state ke hisaab se. */
export const INSTALL_CTA_KEY = EXTENSION_PUBLISHED ? "cta_install" : "cta_notify";
