"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useAuth } from "@/contexts/AuthContext";
import { useLang } from "@/contexts/LangContext";
import { isPaid } from "@/lib/auth";
import PortfolioScoreWidget from "@/components/PortfolioScoreWidget";
import { getEmailPrefs, updateEmailPrefs } from "@/lib/account-api";

const LIVE_FEATURES = [
  { emoji: "🪙", titleKey: "acc_feat_rewards_t", descKey: "acc_feat_rewards_d", href: "/account/rewards" },
  { emoji: "📋", titleKey: "acc_feat_txn_t", descKey: "acc_feat_txn_d", href: "/account/transactions" },
  { emoji: "💸", titleKey: "acc_feat_missed_t", descKey: "acc_feat_missed_d", href: "/account/savings" },
  { emoji: "📄", titleKey: "acc_feat_upload_t", descKey: "acc_feat_upload_d", href: "/account/upload" },
  { emoji: "⭐", titleKey: "acc_feat_reviews_t", descKey: "acc_feat_reviews_d", href: "/cards" },
];

// Card Reviews shipped — nothing pending here right now.
const COMING_SOON: { emoji: string; title: string; desc: string }[] = [];

// ── Email Prefs Toggle ───────────────────────────────────────────────────────
function EmailPrefsToggle({ isPremium }: { isPremium: boolean }) {
  const { t } = useLang();
  const [enabled, setEnabled] = useState(false);
  const [saving, setSaving] = useState(false);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    if (!isPremium) return;
    getEmailPrefs()
      .then((d) => { setEnabled(d.emailReports); setLoaded(true); })
      .catch(() => setLoaded(true));
  }, [isPremium]);

  async function toggle() {
    if (!isPremium || saving) return;
    setSaving(true);
    const next = !enabled;
    try {
      await updateEmailPrefs(next);
      setEnabled(next);
    } catch { /* ignore */ } finally {
      setSaving(false);
    }
  }

  if (!isPremium) {
    return (
      <div className="rounded-xl border border-border bg-surface2 p-4 flex items-center gap-4">
        {/* Dim only the locked feature, NOT the Upgrade CTA (which is a live link). */}
        <span className="text-2xl opacity-50">📧</span>
        <div className="flex-1 min-w-0 opacity-60">
          <div className="text-sm font-bold flex items-center gap-2">
            {t("acc_email_t")}
            <span className="rounded-full bg-accent/15 px-2 py-0.5 text-[10px] font-bold text-accent">{t("acc_email_premium")}</span>
          </div>
          <p className="text-xs text-muted mt-0.5">{t("acc_email_locked_d")}</p>
        </div>
        <Link href="/pricing" className="shrink-0 rounded-lg bg-accent px-3 py-1.5 text-xs font-bold text-onaccent transition-colors hover:bg-blue">
          {t("acc_upgrade")}
        </Link>
      </div>
    );
  }

  return (
    <div className="rounded-xl border border-border bg-surface2 p-4 flex items-center gap-4">
      <span className="text-2xl">📧</span>
      <div className="flex-1 min-w-0">
        <div className="text-sm font-bold">{t("acc_email_t")}</div>
        <p className="text-xs text-muted mt-0.5 leading-relaxed">{t("acc_email_d")}</p>
      </div>
      <button
        onClick={toggle}
        disabled={saving || !loaded}
        aria-label={enabled ? "Disable monthly email" : "Enable monthly email"}
        className={`shrink-0 relative h-6 w-11 rounded-full transition-colors focus:outline-none ${
          enabled ? "bg-accent" : "bg-border"
        } disabled:opacity-50`}
      >
        <span
          className={`absolute top-0.5 left-0.5 h-5 w-5 rounded-full bg-white shadow transition-transform ${
            enabled ? "translate-x-5" : "translate-x-0"
          }`}
        />
      </button>
    </div>
  );
}

// ── Main Page ────────────────────────────────────────────────────────────────
export default function AccountPage() {
  const { user } = useAuth();
  const { t } = useLang();
  if (!user) return null; // layout handles the auth guard

  const isPremium = isPaid(user.plan);
  const initial = (user.name || "?").charAt(0).toUpperCase();

  return (
    <div className="mx-auto max-w-3xl space-y-8 px-5 py-10">

      {/* ── Profile card ── */}
      <div className="flex items-center gap-5 rounded-2xl border border-border bg-surface2 p-6">
        {user.picture ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={user.picture}
            alt=""
            width={64}
            height={64}
            referrerPolicy="no-referrer"
            className="h-16 w-16 rounded-full"
          />
        ) : (
          <span className="flex h-16 w-16 shrink-0 items-center justify-center rounded-full bg-accent text-2xl font-black text-onaccent">
            {initial}
          </span>
        )}

        <div className="min-w-0 flex-1">
          <div className="truncate text-xl font-black">{user.name}</div>
          <div className="truncate text-sm text-muted">{user.email}</div>
          <span
            className={`mt-2 inline-block rounded-full px-3 py-1 text-xs font-bold ${
              isPremium
                ? "bg-accent text-onaccent"
                : "border border-border text-subtle"
            }`}
          >
            {isPremium ? t("acc_badge_premium") : t("acc_badge_free")}
          </span>
        </div>

        {!isPremium && (
          <Link
            href="/pricing"
            className="shrink-0 rounded-xl bg-accent px-4 py-2 text-sm font-bold text-onaccent transition-colors hover:bg-blue"
          >
            {t("acc_upgrade")}
          </Link>
        )}
      </div>

      {/* ── Portfolio Score ── */}
      <PortfolioScoreWidget isPremium={isPremium} />

      {/* ── Upgrade banner for free users ── */}
      {!isPremium && (
        <div className="rounded-2xl border border-accent/30 bg-accent/5 p-6 text-center">
          <div className="mb-2 text-3xl">💎</div>
          <div className="mb-1 text-base font-bold">{t("acc_unlock_h")}</div>
          <p className="mx-auto mb-5 max-w-md text-sm text-muted leading-relaxed">
            {t("acc_unlock_p")}
          </p>
          <Link
            href="/pricing"
            className="inline-block rounded-xl bg-accent px-6 py-2.5 text-sm font-bold text-onaccent transition-colors hover:bg-blue"
          >
            {t("acc_see_plans")}
          </Link>
        </div>
      )}

      {/* ── Live account features ── */}
      <div>
        <h2 className="mb-4 text-lg font-black">{t("acc_features_h")}</h2>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          {LIVE_FEATURES.map((f) => (
            <a
              key={f.titleKey}
              href={f.href}
              className="flex gap-3 rounded-xl border border-border bg-surface2 p-4 transition-colors hover:border-accent"
            >
              <span className="mt-0.5 text-2xl leading-none">{f.emoji}</span>
              <div className="min-w-0">
                <div className="flex items-center gap-2 text-sm font-bold">
                  {t(f.titleKey)}
                  <span className="rounded-full bg-green/15 px-2 py-0.5 text-[10px] font-bold text-green">{t("acc_live")}</span>
                </div>
                <p className="mt-1 text-xs leading-relaxed text-muted">{t(f.descKey)}</p>
              </div>
            </a>
          ))}
        </div>
      </div>

      {/* ── Email report prefs ── */}
      <EmailPrefsToggle isPremium={isPremium} />

      {/* ── Coming soon features (hidden when nothing is pending) ── */}
      {COMING_SOON.length > 0 && (
        <div>
          <h2 className="mb-1 text-lg font-black">Coming soon</h2>
          <p className="mb-5 text-sm text-muted">These features are being built — check back soon.</p>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            {COMING_SOON.map((f) => (
              <div
                key={f.title}
                className="flex gap-3 rounded-xl border border-border bg-surface2 p-4"
              >
                <span className="mt-0.5 text-2xl leading-none">{f.emoji}</span>
                <div className="min-w-0">
                  <div className="flex items-center gap-2 text-sm font-bold">
                    {f.title}
                    <span className="rounded-full border border-border px-2 py-0.5 text-[10px] font-bold text-muted">
                      Soon
                    </span>
                  </div>
                  <p className="mt-1 text-xs leading-relaxed text-muted">{f.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

    </div>
  );
}
