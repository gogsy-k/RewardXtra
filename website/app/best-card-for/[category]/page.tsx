import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { getCards, topRate, formatFee, TYPE_LABEL } from "@/lib/cards";
import { BEST_CARD_CATEGORIES, getBestCategory, rankCardsForCategory } from "@/lib/best-cards";

const YEAR = 2026;

export function generateStaticParams() {
  return BEST_CARD_CATEGORIES.map((c) => ({ category: c.slug }));
}

export async function generateMetadata(props: {
  params: Promise<{ category: string }>;
}): Promise<Metadata> {
  const { category } = await props.params;
  const cat = getBestCategory(category);
  if (!cat) return { title: "Not found" };
  const title = `${cat.label} ke liye best credit card (${YEAR}) · CardWiz`;
  const description = `${cat.label} (${cat.blurb}) par sabse zyada rewards dene wale credit cards — reward rate se ranked, annual fee ke saath. ${YEAR} ki updated list.`;
  return {
    title,
    description,
    alternates: { canonical: `/best-card-for/${cat.slug}` },
    openGraph: { title, description, url: `/best-card-for/${cat.slug}` },
  };
}

export default async function BestCardForCategory(props: {
  params: Promise<{ category: string }>;
}) {
  const { category } = await props.params;
  const cat = getBestCategory(category);
  if (!cat) notFound();

  const cards = await getCards();
  const ranked = rankCardsForCategory(cards, cat.category, 8);

  if (ranked.length === 0) notFound();

  const top = ranked[0];
  const freeCard = ranked.find((r) => !r.card.annualFee || r.card.annualFee === 0);

  // FAQ — visible text + JSON-LD se exactly match (Google requirement).
  const faqs: { q: string; a: string }[] = [
    {
      q: `${cat.label} ke liye sabse achha credit card kaunsa hai?`,
      a: `Abhi ${top.card.name} (${top.card.bank}) ${cat.label} par sabse zyada — ${top.rate}% effective reward — deta hai. Annual fee ${formatFee(top.card)}.`,
    },
    {
      q: `Kya ${cat.label} ke liye koi lifetime-free credit card hai?`,
      a: freeCard
        ? `Haan — ${freeCard.card.name} lifetime-free hai aur ${cat.label} par ${freeCard.rate}% reward deta hai.`
        : `Is list mein zyadatar cards par annual fee hai, lekin kai cards spend-based fee waiver dete hain. Card detail page pe waiver condition check karein.`,
    },
    {
      q: `CardWiz ${cat.label} cards kaise rank karta hai?`,
      a: `Hum sirf un cards ko lete hain jinke paas ${cat.label} ka explicit accelerated reward rule hai, aur unhe effective reward rate ke hisaab se rank karte hain (tie hone par kam annual fee upar). Data har card ke official terms se verify kiya jaata hai.`,
    },
  ];

  const faqLd = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: faqs.map((f) => ({
      "@type": "Question",
      name: f.q,
      acceptedAnswer: { "@type": "Answer", text: f.a },
    })),
  };

  const breadcrumbLd = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [
      { "@type": "ListItem", position: 1, name: "Home", item: "https://cardwiz.in/" },
      { "@type": "ListItem", position: 2, name: "Cards", item: "https://cardwiz.in/cards" },
      {
        "@type": "ListItem",
        position: 3,
        name: `Best for ${cat.label}`,
        item: `https://cardwiz.in/best-card-for/${cat.slug}`,
      },
    ],
  };

  return (
    <div className="mx-auto max-w-4xl px-5 py-10">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(faqLd) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbLd) }} />

      {/* Breadcrumb */}
      <nav className="text-xs text-muted">
        <Link href="/" className="hover:text-subtle">Home</Link> ·{" "}
        <Link href="/cards" className="hover:text-subtle">Cards</Link> ·{" "}
        <span className="text-subtle">Best for {cat.label}</span>
      </nav>

      <h1 className="mt-4 text-3xl font-black sm:text-4xl">
        {cat.label} ke liye best credit cards ({YEAR})
      </h1>
      <p className="mt-3 max-w-2xl text-sm leading-relaxed text-subtle">
        {cat.blurb} par sabse zyada rewards dene wale {ranked.length} cards — effective reward rate se
        ranked. Har card ki annual fee aur reward type neeche. Numbers official terms se verify kiye gaye.
      </p>

      {/* Ranked list */}
      <ol className="mt-8 space-y-3">
        {ranked.map((r, i) => (
          <li key={r.card.id}>
            <Link
              href={`/cards/${r.card.id}`}
              className="flex items-center gap-4 rounded-2xl border border-border bg-surface2 p-4 transition-colors hover:border-accent"
            >
              <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full border-2 border-accent text-sm font-black text-accent">
                {i + 1}
              </span>
              <div className="min-w-0 flex-1">
                <div className="truncate font-bold">{r.card.name}</div>
                <div className="text-xs text-muted">
                  {r.card.bank} · {TYPE_LABEL[r.card.type]} · {formatFee(r.card)}
                </div>
              </div>
              <div className="shrink-0 text-right">
                <div className="text-lg font-black text-green">{r.rate}%</div>
                <div className="text-[10px] text-muted">on {cat.label.toLowerCase()}</div>
              </div>
            </Link>
          </li>
        ))}
      </ol>

      {/* CTA */}
      <div className="mt-10 grid gap-3 sm:grid-cols-2">
        <Link
          href="/ai"
          className="rounded-2xl border border-accent bg-surface2 p-5 transition-colors hover:bg-surface"
        >
          <div className="text-2xl">🤖</div>
          <div className="mt-2 font-bold">Confused? AI se poocho</div>
          <p className="mt-1 text-xs text-subtle">
            Apni exact spending batao, AI {cat.label} ke liye perfect card suggest karega.
          </p>
        </Link>
        <Link
          href="/find-my-card"
          className="rounded-2xl border border-border bg-surface2 p-5 transition-colors hover:border-accent"
        >
          <div className="text-2xl">🎯</div>
          <div className="mt-2 font-bold">Best Card Finder</div>
          <p className="mt-1 text-xs text-subtle">8 sawaal mein apna perfect card dhundo.</p>
        </Link>
      </div>

      {/* FAQ */}
      <section className="mt-12">
        <h2 className="text-xl font-extrabold">Aksar pooche jaane wale sawaal</h2>
        <div className="mt-4 space-y-3">
          {faqs.map((f) => (
            <div key={f.q} className="rounded-2xl border border-border bg-surface2 p-5">
              <h3 className="font-bold">{f.q}</h3>
              <p className="mt-1.5 text-sm leading-relaxed text-subtle">{f.a}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Other categories — internal links */}
      <section className="mt-12">
        <h2 className="text-lg font-extrabold">Doosri categories</h2>
        <div className="mt-4 flex flex-wrap gap-2">
          {BEST_CARD_CATEGORIES.filter((c) => c.slug !== cat.slug).map((c) => (
            <Link
              key={c.slug}
              href={`/best-card-for/${c.slug}`}
              className="rounded-full border border-border bg-surface px-3.5 py-1.5 text-xs text-subtle transition-colors hover:border-accent hover:text-fg"
            >
              Best for {c.label}
            </Link>
          ))}
        </div>
      </section>
    </div>
  );
}
