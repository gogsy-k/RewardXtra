"use client";

import Link from "next/link";
import { useLang } from "@/contexts/LangContext";
import QuizTeaser from "@/components/QuizTeaser";
import PostCard from "@/components/PostCard";
import Reveal from "@/components/motion/Reveal";
import CountUp from "@/components/motion/CountUp";
import { pickPostsForLang, type Post } from "@/lib/posts";
import type { Card } from "@/lib/cards";
import NotifyCTA from "@/components/NotifyCTA";
import SavingsCalculator from "@/components/SavingsCalculator";
import { ShoppingCart, CreditCard, Landmark, Bell, Lock, Star, Bot, Tag, Target, BarChart3, Newspaper } from "lucide-react";

// Feature-grid icons — single-colour Lucide (green accent) instead of multicolour emoji.
const FEAT_ICONS = [ShoppingCart, CreditCard, Landmark, Bell, Lock, Star];

export default function HomeContent({
  total,
  credit,
  banks,
  posts = [],
  calcCards = [],
}: {
  total: number;
  credit: number;
  banks: number;
  posts?: Post[];
  calcCards?: Card[];
}) {
  const { t, lang } = useLang();
  // One card per article in the selected language (dedupes translations).
  const newsPosts = pickPostsForLang(posts, lang).slice(0, 3);

  const features = FEAT_ICONS.map((Icon, i) => ({
    Icon,
    title: t(`feat_${i}_title`),
    desc: t(`feat_${i}_desc`),
  }));

  // Live entry points — har card ek real page pe le jaata hai (no dead text).
  const explore = [
    { Icon: Bot,        href: "/ai",           tk: "ai" },
    { Icon: Tag,        href: "/offers",       tk: "offers" },
    { Icon: Target,     href: "/find-my-card", tk: "find" },
    { Icon: CreditCard, href: "/cards",        tk: "cards" },
    { Icon: BarChart3,  href: "/account",      tk: "acct" },
    { Icon: Newspaper,  href: "/news",         tk: "news" },
  ];

  const steps = [
    { n: 1, title: t("step_1_title"), desc: t("step_1_desc") },
    { n: 2, title: t("step_2_title"), desc: t("step_2_desc") },
    { n: 3, title: t("step_3_title"), desc: t("step_3_desc") },
  ];

  const privBadges = [
    t("priv_0"),
    t("priv_1"),
    t("priv_2"),
    t("priv_3"),
    t("priv_4"),
  ];

  return (
    <>
      {/* HERO */}
      <section className="relative overflow-hidden">
        <div className="pointer-events-none absolute inset-x-0 top-0 h-[420px] bg-[radial-gradient(ellipse_60%_60%_at_50%_0%,rgba(99,102,241,0.12),transparent_70%)]" />
        <div className="mx-auto max-w-4xl px-5 pb-16 pt-20 text-center sm:pt-28">
          <span className="cw-rise inline-block rounded-full border border-border bg-surface px-4 py-1.5 text-xs font-semibold text-green" style={{ animationDelay: "0.03s" }}>
            {t("home_badge")}
          </span>
          <h1 className="cw-rise mt-6 text-4xl font-black leading-tight sm:text-5xl" style={{ animationDelay: "0.08s" }}>
            {t("home_h1")}
          </h1>
          <p className="cw-rise mx-auto mt-5 max-w-xl text-base leading-relaxed text-subtle sm:text-lg" style={{ animationDelay: "0.13s" }}>
            {t("home_sub")}
          </p>
          {/* Primary = live value (Browse); notify is secondary. #notify wrapper kept for the anchor. */}
          <div id="notify" className="cw-rise mt-9 flex flex-wrap items-start justify-center gap-3" style={{ animationDelay: "0.18s" }}>
            <Link
              href="/cards"
              className="rounded-xl bg-accent px-6 py-3.5 text-sm font-bold text-onaccent transition-colors hover:bg-blue"
            >
              {t("home_browse", { n: total })}
            </Link>
            <NotifyCTA variant="secondary" />
          </div>

          {/* Interactive Savings Calculator — live proof, not a static mockup */}
          {calcCards.length > 0 && (
            <div className="cw-rise mt-14" style={{ animationDelay: "0.23s" }}>
              <SavingsCalculator cards={calcCards} />
            </div>
          )}
        </div>
      </section>

      {/* STATS */}
      <section className="border-y border-border bg-surface2">
        <div className="mx-auto grid max-w-4xl grid-cols-3 gap-4 px-5 py-8 text-center">
          {[
            { to: total, suffix: "+", label: t("stat_cards") },
            { to: banks, suffix: "+", label: t("stat_banks") },
            { to: 16, suffix: "", label: t("stat_sites") },
          ].map((s) => (
            <div key={s.label}>
              <CountUp to={s.to} suffix={s.suffix} className="text-3xl font-black text-accent" />
              <div className="mt-1 text-xs text-muted">{s.label}</div>
            </div>
          ))}
        </div>
      </section>

      {/* EXPLORE — live entry points (har card clickable) */}
      <section className="mx-auto max-w-5xl px-5 py-20">
        <h2 className="text-center text-2xl sm:text-3xl font-extrabold">{t("explore_h")}</h2>
        <p className="mt-2 text-center text-subtle">{t("explore_sub")}</p>
        <div className="mt-12 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {explore.map((x, i) => {
            const Icon = x.Icon;
            return (
            <Reveal key={x.href + x.tk} delay={i * 0.05} className="h-full">
              <Link
                href={x.href}
                className="group flex h-full flex-col rounded-2xl border border-accent/40 bg-surface2 p-6 transition hover:-translate-y-0.5 hover:border-accent"
              >
                <Icon className="h-8 w-8 text-accent" strokeWidth={2} />
                <h3 className="mt-3 font-bold">{t(`xp_${x.tk}_t`)}</h3>
                <p className="mt-1.5 flex-1 text-sm leading-relaxed text-subtle">{t(`xp_${x.tk}_d`)}</p>
                <span className="mt-4 text-sm font-bold text-accent transition-transform group-hover:translate-x-0.5">
                  {t("xp_open")}
                </span>
              </Link>
            </Reveal>
            );
          })}
        </div>
      </section>

      {/* WHY CardWiz — value prop (descriptive) */}
      <section className="mx-auto max-w-5xl px-5 pb-4">
        <h2 className="text-center text-2xl sm:text-3xl font-extrabold">{t("home_feat_h")}</h2>
        <p className="mt-2 text-center text-subtle">{t("home_feat_sub")}</p>
        <div className="mt-12 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {features.map((f, i) => {
            const Icon = f.Icon;
            return (
            <Reveal key={f.title} delay={i * 0.05} className="h-full">
              <div className="h-full rounded-2xl border border-border bg-surface2 p-6 transition-colors hover:border-border/80">
                <Icon className="h-8 w-8 text-accent" strokeWidth={2} />
                <h3 className="mt-3 font-bold">{f.title}</h3>
                <p className="mt-1.5 text-sm leading-relaxed text-subtle">{f.desc}</p>
              </div>
            </Reveal>
            );
          })}
        </div>
      </section>

      {/* QUIZ TEASER */}
      <QuizTeaser />

      {/* LATEST NEWS */}
      {newsPosts.length > 0 && (
        <section className="mx-auto max-w-5xl px-5 py-16">
          <div className="flex items-end justify-between">
            <div>
              <h2 className="text-2xl sm:text-3xl font-extrabold">{t("home_news_h")}</h2>
              <p className="mt-2 text-subtle">{t("home_news_sub")}</p>
            </div>
            <Link href="/news" className="shrink-0 text-sm font-semibold text-accent hover:underline">
              {t("home_news_all")} →
            </Link>
          </div>
          <div className="mt-8 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {newsPosts.map((p, i) => (
              <Reveal key={p.id} delay={i * 0.05} className="h-full">
                <PostCard post={p} />
              </Reveal>
            ))}
          </div>
        </section>
      )}

      {/* HOW */}
      <section id="how" className="mx-auto max-w-5xl px-5 pb-20">
        <h2 className="text-center text-2xl sm:text-3xl font-extrabold">{t("home_how_h")}</h2>
        <p className="mt-2 text-center text-subtle">{t("home_how_sub")}</p>
        <div className="mt-12 grid gap-6 sm:grid-cols-3">
          {steps.map((s, i) => (
            <Reveal key={s.n} delay={i * 0.06}>
              <div className="text-center">
                <div className="mx-auto flex h-11 w-11 items-center justify-center rounded-full border-2 border-accent bg-surface text-lg font-extrabold text-accent">
                  {s.n}
                </div>
                <h3 className="mt-4 font-bold">{s.title}</h3>
                <p className="mt-1.5 text-sm text-subtle">{s.desc}</p>
              </div>
            </Reveal>
          ))}
        </div>
      </section>

      {/* PRIVACY */}
      <section className="mx-auto max-w-3xl px-5 pb-20">
        <div className="rounded-2xl border border-border bg-surface2 p-9 text-center">
          <h3 className="text-2xl font-extrabold text-green">{t("home_priv_h")}</h3>
          <p className="mx-auto mt-3 max-w-xl text-sm leading-relaxed text-subtle">
            {t("home_priv_p")}
          </p>
          <div className="mt-5 flex flex-wrap justify-center gap-2">
            {privBadges.map((p) => (
              <span
                key={p}
                className="rounded-full border border-border bg-surface px-3.5 py-1.5 text-xs text-fg"
              >
                {p}
              </span>
            ))}
          </div>
        </div>
      </section>

      {/* FINAL CTA */}
      <section className="mx-auto max-w-3xl px-5 pb-24 text-center">
        <h2 className="text-2xl sm:text-3xl font-extrabold">
          {t("home_cta_h")}
        </h2>
        <p className="mt-3 text-subtle">
          {t("home_cta_sub", { credit, total })}
        </p>
        <div className="mt-7 flex justify-center">
          <NotifyCTA variant="primary" />
        </div>
      </section>
    </>
  );
}
