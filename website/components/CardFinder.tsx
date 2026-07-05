"use client";

import { useMemo, useState } from "react";
import { motion } from "motion/react";
import { Card, cardCategories, topRate, prettyCategory } from "@/lib/cards";
import { useLang } from "@/contexts/LangContext";
import CardItem from "./CardItem";

type SortKey = "reward" | "feeLow" | "name";

export default function CardFinder({ cards }: { cards: Card[] }) {
  const { t } = useLang();
  // Localized category label; brands/unknown ids fall back to prettyCategory (English).
  const catLabel = (c: string) => {
    const v = t("cat_" + c);
    return v === "cat_" + c ? prettyCategory(c) : v;
  };
  const [query, setQuery] = useState("");
  const [variant, setVariant] = useState<"all" | "credit" | "debit">("all");
  const [type, setType] = useState<"all" | "cashback" | "points" | "miles">("all");
  const [category, setCategory] = useState<string>("all");
  const [sort, setSort] = useState<SortKey>("reward");

  const banks = useMemo(
    () => [...new Set(cards.map((c) => c.bank))].sort(),
    [cards]
  );
  const [bank, setBank] = useState<string>("all");

  const categories = useMemo(() => {
    const set = new Set<string>();
    for (const c of cards) for (const cat of cardCategories(c)) set.add(cat);
    return [...set].sort();
  }, [cards]);

  const filtersActive =
    query.trim() !== "" || variant !== "all" || type !== "all" || bank !== "all" || category !== "all";

  function clearFilters() {
    setQuery("");
    setVariant("all");
    setType("all");
    setBank("all");
    setCategory("all");
    setSort("reward");
  }

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    let out = cards.filter((c) => {
      if (variant !== "all" && c.cardType !== variant) return false;
      if (type !== "all" && c.type !== type) return false;
      if (bank !== "all" && c.bank !== bank) return false;
      if (category !== "all" && !cardCategories(c).includes(category)) return false;
      if (q && !(`${c.name} ${c.bank} ${c.network}`.toLowerCase().includes(q))) return false;
      return true;
    });
    out = [...out].sort((a, b) => {
      if (sort === "reward") return topRate(b) - topRate(a);
      if (sort === "feeLow") return (a.annualFee || 0) - (b.annualFee || 0);
      return a.name.localeCompare(b.name);
    });
    return out;
  }, [cards, query, variant, type, bank, category, sort]);

  const selectCls =
    "rounded-lg border border-border bg-surface px-3 py-2 text-sm text-fg outline-none focus:border-accent";

  return (
    <div>
      {/* Search */}
      <div className="relative">
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder={t("cf_search_ph")}
          className="w-full rounded-xl border border-border bg-surface px-4 py-3 text-sm text-fg outline-none placeholder:text-muted focus:border-accent"
        />
      </div>

      {/* Variant tabs */}
      <div className="mt-4 flex gap-2">
        {(["all", "credit", "debit"] as const).map((v) => (
          <button
            key={v}
            onClick={() => setVariant(v)}
            className={`relative rounded-lg border px-4 py-1.5 text-sm font-semibold transition-colors ${
              variant === v
                ? "border-transparent text-onaccent"
                : "border-border bg-surface text-subtle hover:text-fg"
            }`}
          >
            {variant === v && (
              <motion.span
                layoutId="variant-pill"
                className="absolute inset-0 rounded-lg bg-accent"
                transition={{ type: "spring", stiffness: 380, damping: 32 }}
              />
            )}
            <span className="relative z-10">
              {t(v === "all" ? "cf_all_cards" : v === "credit" ? "cf_credit" : "cf_debit")}
            </span>
          </button>
        ))}
      </div>

      {/* Filters */}
      <div className="mt-3 flex flex-wrap gap-2.5">
        <select value={type} onChange={(e) => setType(e.target.value as typeof type)} className={selectCls}>
          <option value="all">{t("cf_all_types")}</option>
          <option value="cashback">{t("cf_type_cashback")}</option>
          <option value="points">{t("cf_type_points")}</option>
          <option value="miles">{t("cf_type_miles")}</option>
        </select>

        <select value={bank} onChange={(e) => setBank(e.target.value)} className={selectCls}>
          <option value="all">{t("cf_all_banks")}</option>
          {banks.map((b) => (
            <option key={b} value={b}>
              {b}
            </option>
          ))}
        </select>

        <select value={category} onChange={(e) => setCategory(e.target.value)} className={selectCls}>
          <option value="all">{t("cf_all_categories")}</option>
          {categories.map((c) => (
            <option key={c} value={c}>
              {catLabel(c)}
            </option>
          ))}
        </select>

        <select value={sort} onChange={(e) => setSort(e.target.value as SortKey)} className={selectCls}>
          <option value="reward">{t("cf_sort_reward")}</option>
          <option value="feeLow">{t("cf_sort_fee")}</option>
          <option value="name">{t("cf_sort_name")}</option>
        </select>
      </div>

      {/* Count */}
      <div className="mt-5 text-sm text-muted tabular-nums">
        {t("cf_count", { n: filtered.length })}
      </div>

      {/* Grid */}
      {filtered.length === 0 ? (
        <div className="mt-10 flex flex-col items-center rounded-2xl border border-dashed border-border py-16 text-center">
          <div className="text-4xl">🔍</div>
          <p className="mt-3 text-sm text-subtle">
            {filtersActive ? t("cf_empty_filtered") : t("cf_empty_none")}
          </p>
          {filtersActive && (
            <button
              onClick={clearFilters}
              className="mt-4 rounded-xl bg-accent px-5 py-2 text-sm font-bold text-onaccent transition-colors hover:bg-blue"
            >
              {t("cf_clear_filters")}
            </button>
          )}
        </div>
      ) : (
        <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {filtered.map((c) => (
            <CardItem key={c.id} card={c} />
          ))}
        </div>
      )}
    </div>
  );
}
