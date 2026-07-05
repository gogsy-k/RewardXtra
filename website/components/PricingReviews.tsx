"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useLang } from "@/contexts/LangContext";
import { getRecentReviews, type Review } from "@/lib/reviews-api";

function Stars({ n }: { n: number }) {
  return (
    <span className="text-sm leading-none">
      {[1, 2, 3, 4, 5].map((i) => (
        <span key={i} className={i <= n ? "opacity-100" : "opacity-25"}>
          ⭐
        </span>
      ))}
    </span>
  );
}

/** Pricing-page social proof — recent real card reviews (empty-state CTA drives the first ones). */
export default function PricingReviews() {
  const { t } = useLang();
  const [reviews, setReviews] = useState<Review[] | null>(null);

  useEffect(() => {
    getRecentReviews(6).then(setReviews);
  }, []);

  if (reviews === null) return null; // still loading — avoid layout jank

  return (
    <section className="mx-auto max-w-5xl px-5 pb-16">
      <h2 className="text-center text-2xl font-extrabold">{t("pr_h")}</h2>
      <p className="mt-2 text-center text-subtle">{t("pr_sub")}</p>

      {reviews.length === 0 ? (
        <div className="mx-auto mt-8 max-w-md rounded-2xl border border-dashed border-border p-8 text-center">
          <div className="text-3xl">⭐</div>
          <p className="mt-2 text-sm text-subtle">{t("pr_empty")}</p>
          <Link
            href="/cards"
            className="mt-4 inline-block rounded-xl bg-accent px-5 py-2.5 text-sm font-bold text-onaccent transition-colors hover:bg-blue"
          >
            {t("pr_browse")}
          </Link>
        </div>
      ) : (
        <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {reviews.map((r) => (
            <Link
              key={r.id}
              href={`/cards/${r.cardId}`}
              className="block rounded-2xl border border-border bg-surface2 p-5 transition-colors hover:border-accent"
            >
              <div className="flex items-center gap-2">
                {r.userPicture ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={r.userPicture} alt="" className="h-7 w-7 rounded-full" referrerPolicy="no-referrer" />
                ) : (
                  <span className="flex h-7 w-7 items-center justify-center rounded-full bg-accent text-xs font-black text-onaccent">
                    {(r.userName || "?").charAt(0).toUpperCase()}
                  </span>
                )}
                <span className="truncate text-sm font-semibold">{r.userName || "Anonymous"}</span>
                {(r.userPlan === "premium" || r.userPlan === "pro") && (
                  <span className="ml-auto rounded-full bg-accent/15 px-2 py-0.5 text-[10px] font-bold text-accent">
                    ✨ {r.userPlan === "pro" ? "Pro" : "Premium"}
                  </span>
                )}
              </div>
              <div className="mt-2">
                <Stars n={r.rating} />
              </div>
              {r.title && <div className="mt-1.5 text-sm font-bold">{r.title}</div>}
              {r.body && <p className="mt-1 line-clamp-3 text-sm leading-relaxed text-muted">{r.body}</p>}
              <span className="mt-3 inline-block text-xs font-semibold text-accent">{t("pr_view")}</span>
            </Link>
          ))}
        </div>
      )}
    </section>
  );
}
