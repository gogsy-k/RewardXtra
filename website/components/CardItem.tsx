"use client";

import Link from "next/link";
import { Card, topRate, formatFee, TYPE_LABEL, cardCategories, prettyCategory } from "@/lib/cards";
import { useLang } from "@/contexts/LangContext";

const TYPE_BADGE: Record<Card["type"], string> = {
  cashback: "bg-green text-bg",
  points: "bg-blue text-bg",
  miles: "bg-yellow text-bg",
};

// Bank monogram (no fake logos): 1 word → first 2 letters; multi-word → initials of first 2 words.
function monogram(bank: string): string {
  const words = bank.trim().split(/\s+/);
  if (words.length === 1) return words[0].slice(0, 2).toUpperCase();
  return (words[0][0] + words[1][0]).toUpperCase();
}

// "Best for" = category from this card's highest-rate rule.
function bestForCategory(card: Card): string | null {
  let best: { rate: number; cat: string } | null = null;
  for (const r of card.rules ?? []) {
    const cat = r.categories?.[0];
    if (cat && (r.effectiveRate ?? 0) > (best?.rate ?? 0)) best = { rate: r.effectiveRate, cat };
  }
  return best?.cat ?? null;
}

export default function CardItem({ card }: { card: Card }) {
  const { t } = useLang();
  const catLabel = (c: string) => {
    const v = t("cat_" + c);
    return v === "cat_" + c ? prettyCategory(c) : v;
  };
  const cats = cardCategories(card).slice(0, 3);
  const bestFor = bestForCategory(card);

  return (
    <Link
      href={`/cards/${card.id}`}
      className="group flex flex-col rounded-2xl border border-border bg-surface2 p-5 transition duration-200 hover:-translate-y-0.5 hover:border-accent"
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex min-w-0 items-start gap-2.5">
          {/* Bank monogram chip */}
          <span className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-border bg-surface text-[11px] font-black text-accent">
            {monogram(card.bank)}
          </span>
          <div className="min-w-0">
            <div className="text-xs font-semibold uppercase tracking-wide text-muted">
              {card.bank} · {card.network}
            </div>
            <h3 className="mt-0.5 font-bold leading-snug group-hover:text-accent">{card.name}</h3>
          </div>
        </div>
        <span className={`shrink-0 rounded-md px-2 py-1 text-[10px] font-bold ${TYPE_BADGE[card.type]}`}>
          {card.cardType}
        </span>
      </div>

      <div className="mt-4 flex items-end justify-between">
        <div>
          <div className="text-2xl font-black text-green tabular-nums [text-shadow:0_0_18px_rgba(52,211,153,0.45)]">
            {topRate(card)}%
          </div>
          <div className="text-[11px] text-muted">{t("ci_top_reward")} · {TYPE_LABEL[card.type]}</div>
        </div>
        <div className="text-right">
          <div className="text-sm font-semibold text-subtle tabular-nums">{formatFee(card)}</div>
          <div className="text-[11px] text-muted">{t("ci_annual_fee")}</div>
        </div>
      </div>

      {/* Best-for tag + category chips */}
      {(bestFor || cats.length > 0) && (
        <div className="mt-4 flex flex-wrap items-center gap-1.5">
          {bestFor && (
            <span className="rounded-full border border-accent/40 bg-accent/10 px-2.5 py-0.5 text-[10px] font-bold text-accent">
              ★ {t("ci_best_for", { cat: catLabel(bestFor) })}
            </span>
          )}
          {cats
            .filter((c) => c !== bestFor)
            .slice(0, 2)
            .map((c) => (
              <span
                key={c}
                className="rounded-full border border-border bg-surface px-2.5 py-0.5 text-[10px] text-subtle"
              >
                {prettyCategory(c)}
              </span>
            ))}
        </div>
      )}
    </Link>
  );
}
