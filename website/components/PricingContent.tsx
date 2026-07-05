"use client";

import PricingPlans from "@/components/PricingPlans";
import PricingReviews from "@/components/PricingReviews";
import { useLang } from "@/contexts/LangContext";

const FAQ_KEYS = ["0", "1", "2", "3"];

export default function PricingContent() {
  const { t } = useLang();

  return (
    <>
      {/* HEADER */}
      <section className="relative overflow-hidden">
        <div className="pointer-events-none absolute inset-x-0 top-0 h-[320px] bg-[radial-gradient(ellipse_60%_60%_at_50%_0%,rgba(99,102,241,0.16),transparent_70%)]" />
        <div className="mx-auto max-w-3xl px-5 pb-10 pt-20 text-center">
          <span className="inline-block rounded-full border border-border bg-surface px-4 py-1.5 text-xs font-semibold text-green">
            {t("pricing_badge")}
          </span>
          <h1 className="mt-6 text-4xl font-black leading-tight sm:text-5xl">
            {t("pricing_h1_a")}{" "}
            <span className="text-accent">{t("pricing_h1_accent")}</span>{" "}
            {t("pricing_h1_b")}
          </h1>
          <p className="mx-auto mt-4 max-w-xl text-base leading-relaxed text-subtle">
            {t("pricing_sub")}
          </p>
        </div>
      </section>

      {/* PLANS */}
      <section className="mx-auto max-w-5xl px-5 pb-16">
        <PricingPlans />
      </section>

      {/* REVIEWS — social proof, above the FAQ */}
      <PricingReviews />

      {/* FAQ */}
      <section className="mx-auto max-w-3xl px-5 pb-24">
        <h2 className="text-center text-2xl font-extrabold">{t("faq_h")}</h2>
        <div className="mt-8 grid gap-4 sm:grid-cols-2">
          {FAQ_KEYS.map((k) => (
            <div key={k} className="rounded-2xl border border-border bg-surface2 p-5">
              <h3 className="font-bold text-fg">{t(`faq_${k}_q`)}</h3>
              <p className="mt-1.5 text-sm leading-relaxed text-muted">{t(`faq_${k}_a`)}</p>
            </div>
          ))}
        </div>
      </section>
    </>
  );
}
