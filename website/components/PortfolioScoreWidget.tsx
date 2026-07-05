"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useLang } from "@/contexts/LangContext";
import { authedFetch } from "@/lib/auth";
import { getCards } from "@/lib/cards";
import {
  portfolioScore,
  scoreColor,
  scoreLabel,
  type PortfolioScoreResult,
  type WalletEntry,
} from "@/lib/portfolio-score";

export default function PortfolioScoreWidget({ isPremium }: { isPremium: boolean }) {
  const { t } = useLang();
  const [result, setResult] = useState<PortfolioScoreResult | null>(null);
  const [loading, setLoading] = useState(true);
  const [empty, setEmpty] = useState(false);

  useEffect(() => {
    async function load() {
      try {
        const [walletRes, catalog] = await Promise.all([
          authedFetch("/cards"),
          getCards(),
        ]);
        const wallet: WalletEntry[] = walletRes.ok ? await walletRes.json() : [];
        if (!wallet.length) { setEmpty(true); return; }
        setResult(portfolioScore(wallet, catalog));
      } catch {
        setEmpty(true);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  if (loading) {
    return (
      <div className="rounded-2xl border border-border bg-surface2 p-6 animate-pulse">
        <div className="h-4 w-32 rounded bg-border mb-3" />
        <div className="h-10 w-16 rounded bg-border" />
      </div>
    );
  }

  if (empty || !result) {
    return (
      <div className="rounded-2xl border border-border bg-surface2 p-6">
        <div className="flex items-center gap-2 mb-1">
          <span className="text-xl">🏆</span>
          <span className="font-black">{t("ps_h")}</span>
        </div>
        <p className="text-sm text-muted mt-2">
          {t("ps_empty")}
        </p>
      </div>
    );
  }

  const { score, details, gaps, suggestions } = result;
  const pct = score;

  return (
    <div className="rounded-2xl border border-border bg-surface2 p-6 space-y-4">
      {/* Header row */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="text-xl">🏆</span>
            <span className="font-black text-base">{t("ps_h")}</span>
          </div>
          <p className="text-xs text-muted">{scoreLabel(score)}</p>
        </div>
        <div className={`text-4xl font-black leading-none ${scoreColor(score)}`}>{score}</div>
      </div>

      {/* Progress bar */}
      <div className="h-2 w-full rounded-full bg-surface overflow-hidden">
        <div
          className={`h-full rounded-full transition-all ${
            score >= 80 ? "bg-green-400" : score >= 40 ? "bg-yellow-400" : "bg-red-400"
          }`}
          style={{ width: `${pct}%` }}
        />
      </div>

      {/* Category pills */}
      <div className="flex flex-wrap gap-2">
        {details.map((d) => (
          <span
            key={d.id}
            className={`flex items-center gap-1 rounded-full px-3 py-1 text-xs font-semibold ${
              d.covered
                ? "bg-green-400/10 text-green-400 border border-green-400/25"
                : "bg-red-400/10 text-red-400 border border-red-400/25"
            }`}
          >
            <span>{d.emoji}</span>
            <span>{d.label}</span>
            <span>{d.covered ? "✓" : "✗"}</span>
          </span>
        ))}
      </div>

      {/* Gaps + suggestions — premium only */}
      {gaps.length > 0 && (
        <div>
          {isPremium ? (
            <div className="space-y-2">
              <div className="text-xs font-bold text-muted uppercase tracking-wide">{t("ps_gaps")}</div>
              {suggestions.map((s) => (
                <div key={s.cardId} className="flex items-center justify-between gap-3 rounded-lg border border-border bg-surface p-3">
                  <div className="min-w-0">
                    <div className="text-xs text-muted">{t("ps_gap", { label: s.forGapLabel })}</div>
                    <div className="text-sm font-bold truncate">{s.name}</div>
                    <div className="text-xs text-muted">{s.bank}</div>
                  </div>
                  <Link
                    href={`/go/${s.cardId}`}
                    className="shrink-0 rounded-lg bg-accent px-3 py-1.5 text-xs font-bold text-onaccent"
                  >
                    {t("sav_view")}
                  </Link>
                </div>
              ))}
            </div>
          ) : (
            <div className="rounded-xl border border-accent/25 bg-accent/5 p-4 text-center">
              <div className="text-sm font-bold mb-1">
                {t("ps_gaps_found", { n: gaps.length })}
              </div>
              <p className="text-xs text-muted mb-3">
                {t("ps_gate_p")}
              </p>
              <Link
                href="/pricing"
                className="inline-block rounded-lg bg-accent px-4 py-1.5 text-xs font-bold text-onaccent"
              >
                {t("acc_upgrade")}
              </Link>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
