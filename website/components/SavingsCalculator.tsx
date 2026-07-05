"use client";

import { useState } from "react";
import Link from "next/link";
import { AnimatePresence, motion } from "motion/react";
import { track } from "@vercel/analytics";
import { type Card, TYPE_LABEL } from "@/lib/cards";
import { rateForCategory } from "@/lib/best-cards";
import { useLang } from "@/contexts/LangContext";
import AnimatedNumber from "@/components/motion/AnimatedNumber";

const PLATFORMS: { category: string; label: string; icon: string }[] = [
  { category: "amazon", label: "Amazon", icon: "🛒" },
  { category: "flipkart", label: "Flipkart", icon: "🛍️" },
  { category: "food_delivery", label: "Swiggy/Zomato", icon: "🍔" },
  { category: "dining", label: "Dining", icon: "🍽️" },
  { category: "fuel", label: "Fuel", icon: "⛽" },
  { category: "travel", label: "Travel", icon: "✈️" },
  { category: "online_shopping", label: "Online", icon: "💻" },
];

const MIN = 500;
const MAX = 50000;
const fmt = (n: number) => "₹" + Math.round(n).toLocaleString("en-IN");

export default function SavingsCalculator({ cards }: { cards: Card[] }) {
  const { t } = useLang();
  const [category, setCategory] = useState("amazon");
  const [amount, setAmount] = useState(10000);

  // Every curated card gets a number (rateForCategory falls back to base rate),
  // so the list is never empty and there's no division anywhere → no NaN.
  const ranked = cards
    .map((c) => {
      const rate = rateForCategory(c, category);
      return { card: c, rate, reward: (amount * rate) / 100 };
    })
    .sort((a, b) => b.reward - a.reward)
    .slice(0, 4);

  const top = ranked[0];
  const second = ranked[1];
  const delta = top && second ? top.reward - second.reward : 0;

  return (
    <div className="mx-auto w-full max-w-sm rounded-2xl border border-border bg-surface2 p-5 text-left shadow-2xl">
      <div className="flex items-center justify-between">
        <span className="text-sm font-bold text-accent">{t("sc_h")}</span>
        <span className="rounded-full bg-green/15 px-2 py-0.5 text-[10px] font-bold text-green">{t("sc_live")}</span>
      </div>

      {/* Platform chips */}
      <div className="mt-3 flex flex-wrap gap-1.5" role="group" aria-label="Platform">
        {PLATFORMS.map((p) => (
          <button
            key={p.category}
            type="button"
            onClick={() => {
              setCategory(p.category);
              track("calc_platform", { platform: p.category });
            }}
            aria-pressed={category === p.category}
            className={`rounded-full px-2.5 py-1 text-xs font-semibold transition-colors ${
              category === p.category
                ? "bg-accent text-onaccent"
                : "border border-border text-subtle hover:text-fg"
            }`}
          >
            {p.icon} {p.label}
          </button>
        ))}
      </div>

      {/* Amount slider */}
      <div className="mt-4">
        <div className="flex items-center justify-between text-xs">
          <label htmlFor="calc-amount" className="text-subtle">
            Kitna kharch karoge?
          </label>
          <span className="font-bold text-fg tabular-nums">{fmt(amount)}</span>
        </div>
        <input
          id="calc-amount"
          type="range"
          min={MIN}
          max={MAX}
          step={500}
          value={amount}
          onChange={(e) => setAmount(Number(e.target.value))}
          aria-valuetext={fmt(amount)}
          className="mt-2 w-full cursor-pointer accent-[var(--color-accent)]"
        />
      </div>

      {/* Ranked results — reorder smoothly as category/amount changes */}
      <div className="mt-4 space-y-1.5">
        <AnimatePresence initial={false}>
          {ranked.map((r, i) => (
            <motion.div
              key={r.card.id}
              layout
              initial={{ opacity: 0, scale: 0.97 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.97 }}
              transition={{ duration: 0.25, ease: [0.16, 1, 0.3, 1] }}
              className={`flex items-center justify-between rounded-lg border px-3 py-2 ${
                i === 0 ? "border-green bg-green/10" : "border-border bg-surface"
              }`}
            >
              <div className="min-w-0">
                <div className="truncate text-xs font-semibold">
                  {i === 0 ? "⭐ " : ""}
                  {r.card.name}
                </div>
                <div className="text-[10px] text-muted">
                  {r.rate}% · {TYPE_LABEL[r.card.type]}
                </div>
              </div>
              <AnimatedNumber
                value={r.reward}
                format={fmt}
                className={`shrink-0 text-sm font-extrabold ${i === 0 ? "text-green" : "text-subtle"}`}
              />
            </motion.div>
          ))}
        </AnimatePresence>
      </div>

      {top && delta > 0 && (
        <p className="mt-3 text-xs text-subtle">
          {t("sc_more", {
            card: top.card.name.split(" ").slice(0, 2).join(" "),
            amt: fmt(delta),
            spend: fmt(amount),
          })}
        </p>
      )}

      <p className="mt-2 text-[10px] text-muted">{t("sc_estimate")}</p>

      <Link
        href="/cards"
        className="mt-3 block rounded-lg bg-accent px-4 py-2 text-center text-xs font-bold text-onaccent transition-colors hover:bg-blue"
      >
        {t("sc_compare_all")}
      </Link>
    </div>
  );
}
