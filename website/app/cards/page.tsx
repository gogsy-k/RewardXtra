import type { Metadata } from "next";
import Link from "next/link";
import { getCards } from "@/lib/cards";
import CardFinder from "@/components/CardFinder";
import T from "@/components/T";
import { BEST_CARD_CATEGORIES } from "@/lib/best-cards";
import { COMPARE_PAIRS, pairToSlug } from "@/lib/compare";

export const metadata: Metadata = {
  title: "Find the best card — 195+ Indian credit & debit cards",
  description:
    "Browse aur compare karo India ke 195+ credit & debit cards — reward rate, annual fee, cashback/points/miles, aur category ke hisaab se. CardWiz pe free.",
};

export default async function CardsPage() {
  const cards = await getCards();

  return (
    <div className="mx-auto max-w-6xl px-5 py-12">
      <h1 className="text-3xl font-extrabold sm:text-4xl">
        <T k="cards_h1" />
      </h1>
      <p className="mt-2 max-w-2xl text-subtle">
        <T k="cards_intro" vars={{ n: cards.length || "195+" }} />
      </p>

      <div className="mt-8">
        {cards.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-border py-16 text-center text-subtle">
            Cards abhi load nahi ho paaye — backend thodi der mein wake hoga (free tier).
            <br />
            Page refresh karke dekho.
          </div>
        ) : (
          <CardFinder cards={cards} />
        )}
      </div>

      {/* Best card by category — SEO hub + internal links */}
      <section className="mt-14 border-t border-border pt-10">
        <h2 className="text-xl font-extrabold"><T k="cards_bestcat_h" /></h2>
        <p className="mt-1.5 text-sm text-subtle">
          <T k="cards_bestcat_p" />
        </p>
        <div className="mt-5 flex flex-wrap gap-2">
          {BEST_CARD_CATEGORIES.map((c) => (
            <Link
              key={c.slug}
              href={`/best-card-for/${c.slug}`}
              className="rounded-full border border-border bg-surface2 px-4 py-2 text-sm text-subtle transition-colors hover:border-accent hover:text-fg"
            >
              <T k="ci_best_for" vars={{ cat: c.label }} />
            </Link>
          ))}
        </div>
      </section>

      {/* Popular comparisons — SEO hub + internal links */}
      <section className="mt-12">
        <div className="flex items-end justify-between gap-3">
          <div>
            <h2 className="text-xl font-extrabold"><T k="cards_compare_h" /></h2>
            <p className="mt-1.5 text-sm text-subtle"><T k="cards_compare_p" /></p>
          </div>
          <Link href="/compare" className="shrink-0 text-sm font-bold text-accent hover:underline">
            <T k="cards_compare_all" />
          </Link>
        </div>
        <div className="mt-5 flex flex-wrap gap-2">
          {(() => {
            const byId = new Map(cards.map((c) => [c.id, c.name]));
            return COMPARE_PAIRS.map(([a, b]) => {
              const na = byId.get(a), nb = byId.get(b);
              if (!na || !nb) return null;
              return (
                <Link
                  key={`${a}-${b}`}
                  href={`/compare/${pairToSlug(a, b)}`}
                  className="rounded-full border border-border bg-surface2 px-4 py-2 text-sm text-subtle transition-colors hover:border-accent hover:text-fg"
                >
                  {na} vs {nb}
                </Link>
              );
            });
          })()}
        </div>
      </section>
    </div>
  );
}
