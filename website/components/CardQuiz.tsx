"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { getCards, prettyCategory, type Card } from "@/lib/cards";
import {
  getRecommendations,
  type QuizAnswers,
  type CategoryKey,
  type CardRec,
  type Reason,
} from "@/lib/quiz-engine";
import { useLang } from "@/contexts/LangContext";

type Field = keyof QuizAnswers;
type Opt = { value: string; icon: string; key: string };
type Question = { field: Field; titleKey: string; opts: Opt[] };

// Shared category list — used for BOTH the primary (#1) and secondary (#2) spend
// questions so every category is selectable in both. Q2 excludes the Q1 pick at
// render time (see below) so the same category never shows twice.
const CATEGORY_OPTIONS: Opt[] = [
  { value: "online", icon: "🛒", key: "quiz_cat_online" },
  { value: "travel", icon: "✈️", key: "quiz_cat_travel" },
  { value: "food", icon: "🍔", key: "quiz_cat_food" },
  { value: "daily", icon: "⛽", key: "quiz_cat_daily" },
  { value: "utility", icon: "💡", key: "quiz_cat_utility" },
  { value: "entertainment", icon: "🎬", key: "quiz_cat_entertainment" },
];

// Each question maps 1:1 to an algorithm lever (see quiz-engine.ts).
const QUESTIONS: Question[] = [
  { field: "q1", titleKey: "quiz_q1_title", opts: CATEGORY_OPTIONS },
  { field: "q2", titleKey: "quiz_q2_title", opts: CATEGORY_OPTIONS },
  {
    field: "monthlySpend",
    titleKey: "quiz_q3_title",
    opts: [
      { value: "8000", icon: "🪙", key: "quiz_q3_8000" },
      { value: "20000", icon: "💵", key: "quiz_q3_20000" },
      { value: "50000", icon: "💸", key: "quiz_q3_50000" },
      { value: "120000", icon: "🏦", key: "quiz_q3_120000" },
    ],
  },
  {
    field: "usage",
    titleKey: "quiz_q4_title",
    opts: [
      { value: "domestic", icon: "🇮🇳", key: "quiz_q4_domestic" },
      { value: "mixed", icon: "🌍", key: "quiz_q4_mixed" },
      { value: "international", icon: "✈️", key: "quiz_q4_international" },
      { value: "business", icon: "🏢", key: "quiz_q4_business" },
    ],
  },
  {
    field: "rewardPref",
    titleKey: "quiz_q5_title",
    opts: [
      { value: "cashback", icon: "💵", key: "quiz_q5_cashback" },
      { value: "points", icon: "🎁", key: "quiz_q5_points" },
      { value: "miles", icon: "✈️", key: "quiz_q5_miles" },
      { value: "premium", icon: "👑", key: "quiz_q5_premium" },
    ],
  },
  {
    field: "maxFee",
    titleKey: "quiz_q6_title",
    opts: [
      { value: "0", icon: "🆓", key: "quiz_q6_0" },
      { value: "1000", icon: "🙂", key: "quiz_q6_1000" },
      { value: "3000", icon: "💎", key: "quiz_q6_3000" },
      { value: "999999", icon: "🚀", key: "quiz_q6_999999" },
    ],
  },
  {
    field: "experience",
    titleKey: "quiz_q7_title",
    opts: [
      { value: "beginner", icon: "🆕", key: "quiz_q7_beginner" },
      { value: "1card", icon: "1️⃣", key: "quiz_q7_1card" },
      { value: "experienced", icon: "💳", key: "quiz_q7_experienced" },
      { value: "expert", icon: "🧠", key: "quiz_q7_expert" },
    ],
  },
  {
    field: "creditScore",
    titleKey: "quiz_q8_title",
    opts: [
      { value: "unknown", icon: "🤷", key: "quiz_q8_unknown" },
      { value: "low", icon: "📉", key: "quiz_q8_low" },
      { value: "good", icon: "📊", key: "quiz_q8_good" },
      { value: "excellent", icon: "📈", key: "quiz_q8_excellent" },
    ],
  },
];

type Phase = "quiz" | "calc" | "results";

export default function CardQuiz() {
  const { t } = useLang();
  const [step, setStep] = useState(0);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [phase, setPhase] = useState<Phase>("quiz");
  const [cards, setCards] = useState<Card[] | null>(null);
  const [result, setResult] = useState<ReturnType<typeof getRecommendations> | null>(null);

  // Prefetch the public catalog while the user answers — results feel instant.
  // Only the public catalog is fetched; the user's ANSWERS never leave the browser.
  useEffect(() => {
    let alive = true;
    getCards().then((c) => alive && setCards(c)).catch(() => alive && setCards([]));
    return () => {
      alive = false;
    };
  }, []);

  function buildAnswers(a: Record<string, string>): QuizAnswers {
    return {
      q1: a.q1 as CategoryKey,
      q2: a.q2 as CategoryKey,
      monthlySpend: Number(a.monthlySpend),
      usage: a.usage as QuizAnswers["usage"],
      rewardPref: a.rewardPref as QuizAnswers["rewardPref"],
      maxFee: Number(a.maxFee),
      experience: a.experience as QuizAnswers["experience"],
      creditScore: a.creditScore as QuizAnswers["creditScore"],
    };
  }

  function choose(field: Field, value: string) {
    setAnswers((prev) => ({ ...prev, [field]: value }));
    if (step < QUESTIONS.length - 1) setStep(step + 1);
    else setPhase("calc");
  }

  // Compute once we're in "calc" AND the catalog has arrived (avoids stale-closure
  // races: the effect re-runs when `cards` resolves). The 600ms beat lets the
  // "calculating" state read before results swap in.
  useEffect(() => {
    if (phase !== "calc" || cards === null) return;
    const id = setTimeout(() => {
      setResult(getRecommendations(cards, buildAnswers(answers)));
      setPhase("results");
    }, 600);
    return () => clearTimeout(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [phase, cards]);

  function restart() {
    setAnswers({});
    setStep(0);
    setResult(null);
    setPhase("quiz");
  }

  if (phase === "results" && result) {
    return <Results result={result} onRestart={restart} />;
  }

  if (phase === "calc") {
    return (
      <div className="mx-auto flex max-w-md flex-col items-center py-24 text-center">
        <div className="h-10 w-10 animate-spin rounded-full border-4 border-border border-t-accent" />
        <p className="mt-5 text-sm text-subtle">{t("quiz_calc")}</p>
      </div>
    );
  }

  // ---- Quiz screen ----
  const q = QUESTIONS[step];
  const total = QUESTIONS.length;
  // Secondary (#2) category excludes whatever was chosen as primary (#1).
  const opts = q.field === "q2" ? q.opts.filter((o) => o.value !== answers.q1) : q.opts;

  return (
    <div className="mx-auto max-w-2xl">
      {/* Progress */}
      <div className="mb-6">
        <div className="flex items-center justify-between">
          <button
            onClick={() => step > 0 && setStep(step - 1)}
            disabled={step === 0}
            className="text-sm text-muted enabled:hover:text-fg disabled:opacity-30"
          >
            ← {t("quiz_back")}
          </button>
          <span className="text-xs font-semibold text-muted">
            {t("quiz_progress", { n: step + 1, total })}
          </span>
        </div>
        <div className="mt-3 h-1.5 w-full overflow-hidden rounded-full bg-surface2">
          <div
            className="h-full rounded-full bg-accent transition-all duration-300"
            style={{ width: `${((step + 1) / total) * 100}%` }}
          />
        </div>
      </div>

      {/* Question */}
      <h2 className="text-center text-2xl font-extrabold sm:text-3xl">{t(q.titleKey)}</h2>

      {/* Options — real buttons for keyboard + screen-reader a11y */}
      <div className="mt-8 grid gap-3 sm:grid-cols-2">
        {opts.map((o) => {
          const selected = answers[q.field] === o.value;
          return (
            <button
              key={o.value}
              onClick={() => choose(q.field, o.value)}
              className={`flex items-center gap-3 rounded-2xl border p-4 text-left transition-colors ${
                selected
                  ? "border-accent bg-surface2"
                  : "border-border bg-surface2 hover:border-accent"
              }`}
            >
              <span className="text-2xl">{o.icon}</span>
              <span className="text-sm font-semibold">{t(o.key)}</span>
            </button>
          );
        })}
      </div>

      <p className="mt-8 text-center text-xs text-muted">🔒 {t("quiz_privacy")}</p>
    </div>
  );
}

// ============================ Results ============================
function Results({
  result,
  onRestart,
}: {
  result: ReturnType<typeof getRecommendations>;
  onRestart: () => void;
}) {
  const { t } = useLang();
  const { results, fallback } = result;

  const freshness = useMemo(() => {
    const dates = results.map((r) => r.card.lastVerified).filter(Boolean) as string[];
    return dates.sort().slice(-1)[0] ?? null;
  }, [results]);

  if (results.length === 0) {
    return (
      <div className="mx-auto max-w-md py-20 text-center">
        <p className="text-lg font-bold">{t("quiz_empty")}</p>
        <button onClick={onRestart} className="mt-6 text-sm font-semibold text-accent hover:underline">
          ↻ {t("quiz_retake")}
        </button>
      </div>
    );
  }

  const [hero, ...alts] = results;

  return (
    <div className="mx-auto max-w-3xl">
      <h2 className="text-center text-2xl font-extrabold sm:text-3xl">{t("quiz_results_title")}</h2>
      <p className="mt-2 text-center text-xs text-green">🔒 {t("quiz_privacy")}</p>

      {fallback && (
        <p className="mx-auto mt-5 max-w-xl rounded-xl border border-yellow/40 bg-surface2 px-4 py-2.5 text-center text-xs text-yellow">
          {t("quiz_fallback")}
        </p>
      )}

      {/* Hero pick */}
      <div className="mt-8">
        <RecCard rec={hero} hero />
      </div>

      {/* Alternatives */}
      {alts.length > 0 && (
        <div className="mt-5 grid gap-4 sm:grid-cols-2">
          {alts.map((r) => (
            <RecCard key={r.card.id} rec={r} />
          ))}
        </div>
      )}

      {/* Disclaimers */}
      <div className="mt-10 space-y-1.5 rounded-2xl border border-border bg-surface2 p-5 text-[11px] leading-relaxed text-muted">
        <p>💼 {t("quiz_disc_affiliate")}</p>
        <p>ℹ️ {t("quiz_disc_advice")}</p>
        <p>🎯 {t("quiz_disc_redemption")}</p>
        {freshness && <p>🗓️ {t("quiz_freshness", { date: freshness })}</p>}
      </div>

      <div className="mt-6 text-center">
        <button onClick={onRestart} className="text-sm font-semibold text-accent hover:underline">
          ↻ {t("quiz_retake")}
        </button>
      </div>
    </div>
  );
}

function RecCard({ rec, hero = false }: { rec: CardRec; hero?: boolean }) {
  const { t } = useLang();
  const c = rec.card;

  const feeLine =
    (c.annualFee ?? 0) === 0
      ? t("quiz_fee_ltf")
      : rec.feeWaived
        ? t("quiz_fee_waived", { v: c.feeWaiverSpend.toLocaleString("en-IN") })
        : t("quiz_fee_yr", { v: c.annualFee.toLocaleString("en-IN") });

  return (
    <div
      className={`flex flex-col rounded-2xl border p-6 ${
        hero ? "border-accent bg-surface2 shadow-2xl" : "border-border bg-surface2"
      }`}
    >
      <div className="flex items-start justify-between gap-3">
        <div>
          {hero && (
            <span className="mb-1.5 inline-block rounded-full bg-accent px-2.5 py-0.5 text-[10px] font-bold text-onaccent">
              ⭐ {t("quiz_hero_badge")}
            </span>
          )}
          <h3 className={`font-extrabold ${hero ? "text-xl" : "text-base"}`}>{c.name}</h3>
          <p className="mt-0.5 text-xs text-muted">
            {c.bank} · {c.network}
          </p>
        </div>
      </div>

      {/* The honest backbone number */}
      <div className="mt-4">
        <div className={`font-black text-green ${hero ? "text-2xl" : "text-xl"}`}>
          ~₹{Math.max(0, rec.ongoingNetAnnual).toLocaleString("en-IN")}
        </div>
        <div className="text-[11px] text-muted">{t("quiz_ongoing_label")}</div>
      </div>

      {/* First-year bonus — only when known, separate line */}
      {rec.welcomeValueINR != null && (
        <div className="mt-2 text-xs font-semibold text-blue">
          🎁 {t("quiz_first_year", { v: rec.welcomeValueINR.toLocaleString("en-IN") })}
        </div>
      )}

      {/* Fee */}
      <div className="mt-3 text-xs text-subtle">💳 {feeLine}</div>

      {/* Reasoning chips — built from the SAME rules used in scoring */}
      {rec.reasons.length > 0 && (
        <div className="mt-3 flex flex-wrap gap-1.5">
          {rec.reasons.map((r, i) => (
            <span key={i} className="rounded-full border border-border bg-surface px-2.5 py-0.5 text-[11px] text-subtle">
              {reasonText(t, r)}
            </span>
          ))}
        </div>
      )}

      {/* Eligibility flag — soft, never "not eligible" */}
      {rec.eligibilityFlag && (
        <div className="mt-3 text-[11px] text-yellow">⚠️ {t("quiz_elig_flag")}</div>
      )}

      {/* CTAs */}
      <div className="mt-5 flex items-center gap-2">
        <a
          href={`/go/${c.id}`}
          target="_blank"
          rel="noopener"
          className="flex-1 rounded-xl bg-accent px-4 py-2.5 text-center text-sm font-bold text-onaccent transition-colors hover:bg-blue"
        >
          {t("quiz_apply")}
        </a>
        <Link
          href={`/cards/${c.id}`}
          className="rounded-xl border border-border px-4 py-2.5 text-center text-sm font-semibold text-accent transition-colors hover:border-accent"
        >
          {t("quiz_details")}
        </Link>
      </div>
      <p className="mt-1.5 text-center text-[10px] text-muted">{t("quiz_apply_note")}</p>
    </div>
  );
}

function reasonText(t: (k: string, v?: Record<string, string | number>) => string, r: Reason): string {
  if (r.kind === "reward") return t("quiz_reason_reward", { cat: prettyCategory(r.category), rate: r.rate });
  if (r.kind === "ltf") return t("quiz_reason_ltf");
  return t("quiz_reason_waived");
}
