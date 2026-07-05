"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { track } from "@vercel/analytics";
import { useAuth } from "@/contexts/AuthContext";
import { useLang } from "@/contexts/LangContext";
import { getOffers, submitOffer, type Offer, type SubmitOfferPayload } from "@/lib/offers-api";

const BANKS = [
  "HDFC", "SBI", "ICICI", "Axis", "Kotak", "IDFC First", "AU Small Finance",
  "Yes Bank", "IndusInd", "RBL", "HSBC", "Amex", "Standard Chartered",
  "Federal Bank", "Punjab National Bank", "Bank of Baroda",
];

function fmtDate(d: string) {
  return new Date(d).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" });
}

function OfferCard({ offer }: { offer: Offer }) {
  const { t } = useLang();
  const expired = offer.validUntil && new Date(offer.validUntil) < new Date();
  return (
    <div className={`rounded-xl border bg-surface2 p-4 space-y-1.5 ${expired ? "opacity-50" : "border-border"}`}>
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <div className="text-sm font-bold leading-snug">{offer.title}</div>
          <div className="text-xs text-accent font-semibold mt-0.5">{offer.discountText}</div>
        </div>
        {expired && (
          <span className="shrink-0 text-[10px] font-bold rounded-full bg-red-400/15 text-red-400 px-2 py-0.5">{t("off_expired")}</span>
        )}
      </div>
      <div className="flex flex-wrap gap-2 text-xs text-muted">
        <span>🏪 {offer.merchant}</span>
        {offer.bank && <span>🏦 {offer.bank}</span>}
        {offer.cardId && (
          <Link href={`/cards/${offer.cardId}`} className="text-accent hover:underline">
            {t("off_view_card")}
          </Link>
        )}
        {offer.validUntil && <span>{t("off_valid", { date: fmtDate(offer.validUntil) })}</span>}
      </div>
    </div>
  );
}

function SubmitForm({ onSubmitted }: { onSubmitted: (o: Offer) => void }) {
  const { t } = useLang();
  const [form, setForm] = useState<SubmitOfferPayload>({
    merchant: "", bank: "", title: "", discountText: "", validUntil: "",
  });
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [done, setDone] = useState(false);

  function set(k: keyof SubmitOfferPayload, v: string) {
    setForm((f) => ({ ...f, [k]: v }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    setError("");
    try {
      const offer = await submitOffer({
        merchant: form.merchant,
        bank: form.bank || undefined,
        title: form.title,
        discountText: form.discountText,
        validUntil: form.validUntil || undefined,
      });
      setDone(true);
      track("offer_submit");
      onSubmitted(offer);
    } catch (err) {
      if (err instanceof Error && err.message === "daily_limit") {
        setError(t("off_err_limit"));
      } else {
        setError(err instanceof Error ? err.message : "Submit failed.");
      }
    } finally {
      setSubmitting(false);
    }
  }

  if (done) {
    return (
      <div className="rounded-xl border border-green-400/30 bg-green-400/5 p-5 text-center">
        <div className="text-2xl mb-2">✅</div>
        <div className="font-bold text-sm">{t("off_done_h")}</div>
        <p className="text-xs text-subtle mt-1">{t("off_done_p")}</p>
        <button onClick={() => { setDone(false); setForm({ merchant: "", bank: "", title: "", discountText: "", validUntil: "" }); }}
          className="mt-3 text-xs text-accent hover:underline">
          {t("off_submit_another")}
        </button>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="rounded-xl border border-border bg-surface2 p-5 space-y-3">
      <div className="text-sm font-black">{t("off_submit_h")}</div>
      <p className="text-xs text-subtle">{t("off_submit_sub")}</p>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div>
          <label className="block text-xs text-muted mb-1">{t("off_merchant")}</label>
          <input value={form.merchant} onChange={(e) => set("merchant", e.target.value)} required
            placeholder={t("off_merchant_ph")} maxLength={100}
            className="w-full rounded-lg border border-border bg-bg px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-accent" />
        </div>
        <div>
          <label className="block text-xs text-muted mb-1">{t("off_bank")}</label>
          <select value={form.bank} onChange={(e) => set("bank", e.target.value)}
            className="w-full rounded-lg border border-border bg-bg px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-accent">
            <option value="">{t("off_select_bank")}</option>
            {BANKS.map((b) => <option key={b} value={b}>{b}</option>)}
          </select>
        </div>
        <div className="sm:col-span-2">
          <label className="block text-xs text-muted mb-1">{t("off_title")}</label>
          <input value={form.title} onChange={(e) => set("title", e.target.value)} required
            placeholder={t("off_title_ph")} maxLength={120}
            className="w-full rounded-lg border border-border bg-bg px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-accent" />
        </div>
        <div>
          <label className="block text-xs text-muted mb-1">{t("off_discount")}</label>
          <input value={form.discountText} onChange={(e) => set("discountText", e.target.value)} required
            placeholder={t("off_discount_ph")} maxLength={200}
            className="w-full rounded-lg border border-border bg-bg px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-accent" />
        </div>
        <div>
          <label className="block text-xs text-muted mb-1">{t("off_valid_until")}</label>
          <input type="date" value={form.validUntil} onChange={(e) => set("validUntil", e.target.value)}
            className="w-full rounded-lg border border-border bg-bg px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-accent" />
        </div>
      </div>

      {error && <p className="text-xs text-red-400">{error}</p>}

      <button type="submit" disabled={submitting}
        className="rounded-lg bg-accent px-5 py-2 text-sm font-bold text-onaccent disabled:opacity-50">
        {submitting ? t("off_submitting") : t("off_submit_btn")}
      </button>
    </form>
  );
}

export default function OffersPage() {
  const { user } = useAuth();
  const { t } = useLang();
  const [offers, setOffers] = useState<Offer[]>([]);
  const [bank, setBank] = useState("");
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    const list = await getOffers(bank ? { bank } : {});
    setOffers(list);
    setLoading(false);
  }, [bank]);

  useEffect(() => { load(); }, [load]);

  return (
    <div className="mx-auto max-w-3xl px-5 py-10 space-y-8">

      <div>
        <h1 className="text-2xl font-black">{t("off_h")}</h1>
        <p className="text-sm text-subtle mt-0.5">{t("off_sub")}</p>
      </div>

      {/* Bank filter */}
      <div className="flex flex-wrap gap-2">
        <button onClick={() => setBank("")}
          className={`rounded-full px-3 py-1.5 text-xs font-bold border transition-colors ${!bank ? "bg-accent text-onaccent border-accent" : "border-border hover:border-accent"}`}>
          {t("off_all")}
        </button>
        {BANKS.slice(0, 8).map((b) => (
          <button key={b} onClick={() => setBank(b === bank ? "" : b)}
            className={`rounded-full px-3 py-1.5 text-xs font-bold border transition-colors ${bank === b ? "bg-accent text-onaccent border-accent" : "border-border hover:border-accent"}`}>
            {b}
          </button>
        ))}
      </div>

      {/* Offers list */}
      {loading ? (
        <div className="text-sm text-muted animate-pulse py-8 text-center">{t("txn_loading")}</div>
      ) : offers.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-border p-10 text-center text-subtle">
          <div className="text-3xl mb-3">🏷️</div>
          <div className="text-sm">{bank ? t("off_empty_bank", { bank }) : t("off_empty")}</div>
        </div>
      ) : (
        <div className="space-y-3">
          {offers.map((o) => <OfferCard key={o.id} offer={o} />)}
        </div>
      )}

      {/* Submit form */}
      <div>
        {user ? (
          <SubmitForm onSubmitted={(o) => { if (o.status === 'approved') setOffers((prev) => [o, ...prev]); }} />
        ) : (
          <div className="rounded-xl border border-border bg-surface2 p-5 text-center">
            <div className="font-bold text-sm mb-1">{t("off_signin_h")}</div>
            <p className="text-xs text-subtle mb-4">{t("off_signin_p")}</p>
            <Link href="/sign-in" className="inline-block rounded-xl bg-accent px-5 py-2.5 text-sm font-bold text-onaccent">
              {t("off_signin_btn")}
            </Link>
          </div>
        )}
      </div>

    </div>
  );
}
