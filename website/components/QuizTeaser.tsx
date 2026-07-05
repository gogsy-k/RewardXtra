"use client";

import Link from "next/link";
import { useLang } from "@/contexts/LangContext";

export default function QuizTeaser() {
  const { t } = useLang();

  return (
    <section className="mx-auto max-w-5xl px-5 pb-4">
      <div className="relative overflow-hidden rounded-3xl border border-accent/40 bg-surface2 p-8 text-center sm:p-10">
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_50%_80%_at_50%_0%,rgba(99,102,241,0.14),transparent_70%)]" />
        <div className="relative">
          <div className="text-4xl">🤖</div>
          <h2 className="mt-3 text-2xl font-extrabold sm:text-3xl">{t("quiz_teaser_title")}</h2>
          <p className="mx-auto mt-2 max-w-lg text-sm leading-relaxed text-subtle">
            {t("quiz_teaser_sub")}
          </p>
          <Link
            href="/find-my-card"
            className="mt-6 inline-block rounded-xl bg-accent px-6 py-3.5 text-sm font-bold text-onaccent transition-colors hover:bg-blue"
          >
            {t("quiz_teaser_cta")}
          </Link>
        </div>
      </div>
    </section>
  );
}
