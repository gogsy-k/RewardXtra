"use client";

import { useLang } from "@/contexts/LangContext";
import { SHOP_LINKS } from "@/lib/affiliate";

export default function ShopAndEarn() {
  const { t } = useLang();

  return (
    <section className="mx-auto max-w-5xl px-5 py-14">
      <div className="rounded-3xl border border-border bg-surface2/50 p-6 sm:p-8">
        <h2 className="text-center text-2xl font-black">{t("shop_h")}</h2>
        <p className="mx-auto mt-1 max-w-xl text-center text-sm text-muted">{t("shop_sub")}</p>

        <div className="mt-6 grid grid-cols-2 gap-2.5 sm:grid-cols-3 md:grid-cols-4">
          {SHOP_LINKS.map((s) => (
            <a
              key={s.name}
              href={s.url}
              target="_blank"
              rel="sponsored noopener noreferrer"
              className="flex items-center gap-2.5 rounded-xl border border-border bg-bg px-4 py-3 text-sm font-bold transition-colors hover:border-accent hover:text-accent"
            >
              <span className="text-lg">{s.emoji}</span>
              <span className="truncate">{s.name}</span>
              <span className="ml-auto text-muted">↗</span>
            </a>
          ))}
        </div>

        <p className="mt-5 text-center text-xs text-muted">{t("shop_disclosure")}</p>
      </div>
    </section>
  );
}
