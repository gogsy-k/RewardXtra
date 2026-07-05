"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { useAuth } from "@/contexts/AuthContext";
import { useLang } from "@/contexts/LangContext";
import { isPaid } from "@/lib/auth";
import { getMissedSavings, type SavingsReport, type CategoryMiss } from "@/lib/savings-api";
import { CATEGORY_LABEL } from "@/lib/cards";
import ScorecardShare from "@/components/ScorecardShare";

// ── Date helpers ─────────────────────────────────────────────────────────────

function toYMD(d: Date): string {
  return d.toISOString().slice(0, 10);
}

type Period = { labelKey: string; from: string; to: string };

function buildPeriods(): Period[] {
  const now = new Date();
  const y = now.getFullYear();
  const m = now.getMonth(); // 0-based

  const thisMonthStart = new Date(y, m, 1);
  const lastMonthStart = new Date(y, m - 1, 1);
  const lastMonthEnd   = new Date(y, m, 0);
  const threeMonthsAgo = new Date(y, m - 3, 1);

  return [
    { labelKey: "sav_p_this", from: toYMD(thisMonthStart), to: toYMD(now) },
    { labelKey: "sav_p_last", from: toYMD(lastMonthStart), to: toYMD(lastMonthEnd) },
    { labelKey: "sav_p_3mo",  from: toYMD(threeMonthsAgo), to: toYMD(now) },
    { labelKey: "sav_p_all",  from: "2024-01-01",          to: toYMD(now) },
  ];
}

function fmtINR(n: number, fractions = 0): string {
  return "₹" + n.toLocaleString("en-IN", { minimumFractionDigits: fractions, maximumFractionDigits: fractions });
}

// ── Stat card ─────────────────────────────────────────────────────────────────

function StatCard({
  label,
  value,
  sub,
  accent,
  blurred,
}: {
  label: string;
  value: string;
  sub?: string;
  accent?: string;
  blurred?: boolean;
}) {
  return (
    <div className="rounded-xl border border-border bg-surface2 p-4">
      <div className="text-xs text-muted mb-1">{label}</div>
      <div className={`text-2xl font-black tabular-nums ${accent ?? ""} ${blurred ? "blur-sm select-none" : ""}`}>
        {value}
      </div>
      {sub && <div className={`text-xs text-muted mt-0.5 ${blurred ? "blur-sm select-none" : ""}`}>{sub}</div>}
    </div>
  );
}

// ── Category row ─────────────────────────────────────────────────────────────

function CategoryRow({ row, blurred }: { row: CategoryMiss; blurred: boolean }) {
  const { t } = useLang();
  const label = CATEGORY_LABEL[row.category] ?? row.category;
  return (
    <div className={`flex items-center gap-3 py-2.5 border-b border-border last:border-0 ${blurred ? "blur-sm select-none" : ""}`}>
      <div className="flex-1 min-w-0">
        <div className="text-sm font-semibold">{label}</div>
        <div className="text-xs text-muted">{t("sav_txn_spent", { n: row.transactions, amt: fmtINR(row.totalSpend) })}</div>
      </div>
      <div className="shrink-0 text-right">
        <div className="text-sm font-black text-red-400">−{fmtINR(row.missed)}</div>
        {row.betterCardName && (
          <div className="text-[10px] text-muted">{t("sav_use", { card: row.betterCardName, rate: row.rateIfUsed })}</div>
        )}
      </div>
    </div>
  );
}

// ── Main Page ─────────────────────────────────────────────────────────────────

export default function SavingsPage() {
  const { user } = useAuth();
  const { t } = useLang();
  const isPremium = isPaid(user?.plan);

  const PERIODS = buildPeriods();
  const [periodIdx, setPeriodIdx] = useState(0);
  const [report, setReport] = useState<SavingsReport | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const { from, to } = PERIODS[periodIdx];

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const r = await getMissedSavings({ from, to });
      setReport(r);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load report.");
    } finally {
      setLoading(false);
    }
  }, [from, to]);

  useEffect(() => { load(); }, [load]);

  if (!user) return null;

  const blurDetails = !isPremium;

  return (
    <div className="mx-auto max-w-3xl space-y-6 px-5 py-10">

      {/* Header */}
      <div>
        <Link href="/account" className="text-xs text-muted hover:text-subtle">← Account</Link>
        <h1 className="mt-1 text-2xl font-black">{t("acc_feat_missed_t")}</h1>
        <p className="text-sm text-muted mt-0.5">{t("sav_sub")}</p>
      </div>

      {/* Period picker */}
      <div className="flex flex-wrap gap-2">
        {PERIODS.map((p, i) => (
          <button
            key={p.labelKey}
            onClick={() => setPeriodIdx(i)}
            className={`rounded-full px-4 py-1.5 text-xs font-bold transition-colors ${
              i === periodIdx
                ? "bg-accent text-onaccent"
                : "border border-border text-muted hover:border-accent hover:text-text"
            }`}
          >
            {t(p.labelKey)}
          </button>
        ))}
      </div>

      {/* Loading */}
      {loading && (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 animate-pulse">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="rounded-xl border border-border bg-surface2 p-4 h-20" />
          ))}
        </div>
      )}

      {/* Error */}
      {!loading && error && (
        <div className="rounded-xl border border-red-400/30 bg-red-400/5 p-4 text-sm text-red-400">
          {error} — <button onClick={load} className="underline">{t("sav_retry")}</button>
        </div>
      )}

      {/* Empty state */}
      {!loading && !error && report?.empty && (
        <div className="rounded-2xl border border-dashed border-border p-10 text-center">
          <div className="text-4xl mb-3">📊</div>
          {report.emptyReason === "no_transactions" ? (
            <>
              <div className="font-bold">{t("sav_empty_notxn_h")}</div>
              <p className="text-sm text-muted mt-1 mb-4">{t("sav_empty_notxn_p")}</p>
              <Link
                href="/account/transactions"
                className="inline-block rounded-xl bg-accent px-5 py-2.5 text-sm font-bold text-onaccent"
              >
                {t("sav_add_txn")}
              </Link>
            </>
          ) : (
            <>
              <div className="font-bold">{t("sav_empty_nocards_h")}</div>
              <p className="text-sm text-muted mt-1">{t("sav_empty_nocards_p")}</p>
            </>
          )}
        </div>
      )}

      {/* Report */}
      {!loading && !error && report && !report.empty && (
        <>
          {/* Shareable scorecard — premium perk (free users get the upgrade gate below) */}
          {isPremium && (
            <ScorecardShare
              earned={report.actualRewards}
              missed={report.missed}
              eff={report.efficiency}
              period={t(PERIODS[periodIdx].labelKey)}
              name={user.name?.split(" ")[0]}
            />
          )}

          {/* Stat cards */}
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            <StatCard label={t("sav_stat_spend")}   value={fmtINR(report.totalSpend)}      />
            <StatCard label={t("sav_stat_earned")}  value={fmtINR(report.actualRewards)}   accent="text-green-400" />
            <StatCard
              label={t("sav_stat_could")}
              value={fmtINR(report.possibleRewards)}
              accent="text-yellow-400"
              blurred={blurDetails}
            />
            <StatCard
              label={t("sav_stat_left")}
              value={fmtINR(report.missed)}
              sub={t("sav_left_sub", { n: 100 - report.efficiency })}
              accent="text-red-400"
              blurred={blurDetails}
            />
          </div>

          {/* Efficiency bar */}
          <div>
            <div className="flex justify-between text-xs text-muted mb-1.5">
              <span>{t("sav_efficiency")}</span>
              <span className={blurDetails ? "blur-sm" : ""}>{report.efficiency}%</span>
            </div>
            <div className="h-2.5 w-full rounded-full bg-surface overflow-hidden">
              <div
                className={`h-full rounded-full transition-all ${
                  report.efficiency >= 80 ? "bg-green-400" :
                  report.efficiency >= 50 ? "bg-yellow-400" : "bg-red-400"
                } ${blurDetails ? "blur-sm" : ""}`}
                style={{ width: `${report.efficiency}%` }}
              />
            </div>
            <div className="text-xs text-muted mt-1">
              {t("sav_analysed", { n: report.transactionCount })}
            </div>
          </div>

          {/* Premium gate overlay for free users */}
          {blurDetails && report.missed > 0 && (
            <div className="relative rounded-2xl border border-accent/30 bg-accent/5 p-6 text-center">
              <div className="text-4xl mb-2">💎</div>
              <div className="font-bold text-lg mb-1">
                {t("sav_gate_h", { amt: fmtINR(report.missed) })}
              </div>
              <p className="text-sm text-muted mb-5 max-w-sm mx-auto leading-relaxed">
                {t("sav_gate_p")}
              </p>
              <Link
                href="/pricing"
                className="inline-block rounded-xl bg-accent px-6 py-2.5 text-sm font-bold text-onaccent"
              >
                {t("sav_gate_cta")}
              </Link>
              <p className="text-xs text-muted mt-3">{t("sav_gate_note")}</p>
            </div>
          )}

          {/* By Category breakdown — premium only */}
          {report.byCategory.length > 0 && (
            <div className={`rounded-2xl border border-border bg-surface2 overflow-hidden ${blurDetails ? "pointer-events-none" : ""}`}>
              <div className="px-4 py-3 border-b border-border">
                <span className="text-xs font-bold text-muted uppercase tracking-wide">
                  {t("sav_by_cat")}
                </span>
              </div>
              <div className="px-4">
                {report.byCategory.map((row) => (
                  <CategoryRow key={row.category} row={row} blurred={blurDetails} />
                ))}
              </div>
            </div>
          )}

          {/* By Card — premium only */}
          {report.byCard.length > 0 && !blurDetails && (
            <div className="rounded-2xl border border-border bg-surface2 overflow-hidden">
              <div className="px-4 py-3 border-b border-border">
                <span className="text-xs font-bold text-muted uppercase tracking-wide">
                  {t("sav_by_card")}
                </span>
              </div>
              <div className="divide-y divide-border">
                {report.byCard.map((row) => (
                  <div key={row.cardId ?? "__none__"} className="flex items-center justify-between px-4 py-3">
                    <div>
                      <div className="text-sm font-semibold">{row.cardName}</div>
                      <div className="text-xs text-muted">{row.transactions} transaction{row.transactions !== 1 ? "s" : ""}</div>
                    </div>
                    <div className="text-sm font-black text-red-400">−{fmtINR(row.missed)}</div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Opportunities — premium only */}
          {!blurDetails && report.byCategory.some((r) => r.betterCardName && r.missed > 0) && (
            <div className="rounded-2xl border border-border bg-surface2 p-5 space-y-3">
              <div className="text-xs font-bold text-muted uppercase tracking-wide">{t("sav_opps")}</div>
              {report.byCategory
                .filter((r) => r.betterCardName && r.missed > 0)
                .slice(0, 4)
                .map((r) => (
                  <div key={r.category} className="flex items-center gap-3 rounded-xl border border-border bg-surface p-3">
                    <div className="flex-1 min-w-0">
                      <div className="text-xs text-muted">{t("sav_opp_cat", { cat: CATEGORY_LABEL[r.category] ?? r.category })}</div>
                      <div className="text-sm font-bold truncate">
                        {t("sav_opp_line", { card: r.betterCardName ?? "", rate: r.rateIfUsed, amt: fmtINR(r.missed) })}
                      </div>
                    </div>
                    <Link
                      href={`/go/${r.betterCardId}`}
                      className="shrink-0 rounded-lg bg-accent px-3 py-1.5 text-xs font-bold text-onaccent"
                    >
                      {t("sav_view")}
                    </Link>
                  </div>
                ))}
            </div>
          )}

          {/* Add more transactions CTA */}
          {report.transactionCount < 5 && (
            <div className="rounded-xl border border-border bg-surface2 p-4 flex items-center gap-4">
              <span className="text-2xl shrink-0">💡</span>
              <div className="min-w-0 flex-1">
                <div className="text-sm font-bold">{t("sav_addmore_h")}</div>
                <p className="text-xs text-muted mt-0.5">
                  {t("sav_addmore_p", { n: report.transactionCount })}
                </p>
              </div>
              <Link
                href="/account/transactions"
                className="shrink-0 rounded-lg border border-border px-3 py-1.5 text-xs font-bold hover:border-accent hover:text-accent"
              >
                {t("sav_add")}
              </Link>
            </div>
          )}
        </>
      )}

    </div>
  );
}
