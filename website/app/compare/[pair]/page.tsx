import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import {
  getCards,
  getCard,
  topRate,
  formatFee,
  TYPE_LABEL,
  cardCategories,
  prettyCategory,
  type Card,
} from "@/lib/cards";
import { COMPARE_PAIRS, pairToSlug, parsePair } from "@/lib/compare";

const YEAR = 2026;

export function generateStaticParams() {
  return COMPARE_PAIRS.map(([a, b]) => ({ pair: pairToSlug(a, b) }));
}

export async function generateMetadata(props: {
  params: Promise<{ pair: string }>;
}): Promise<Metadata> {
  const { pair } = await props.params;
  const ids = parsePair(pair);
  if (!ids) return { title: "Not found" };
  const [a, b] = await Promise.all([getCard(ids[0]), getCard(ids[1])]);
  if (!a || !b) return { title: "Not found" };
  const title = `${a.name} vs ${b.name} — kaunsa behtar? (${YEAR}) · CardWiz`;
  const description = `${a.name} aur ${b.name} ka side-by-side comparison — reward rate, annual fee, categories aur benefits. ${YEAR} ke liye kaunsa card aapke liye behtar, CardWiz pe dekho.`;
  return {
    title,
    description,
    alternates: { canonical: `/compare/${pair}` },
    openGraph: { title, description, url: `/compare/${pair}` },
  };
}

function Cell({ a, b, winner }: { a: string; b: string; winner?: "a" | "b" | "tie" }) {
  return (
    <>
      <td className={`px-4 py-3 text-sm tabular-nums ${winner === "a" ? "font-bold text-green" : "text-subtle"}`}>{a}</td>
      <td className={`px-4 py-3 text-sm tabular-nums ${winner === "b" ? "font-bold text-green" : "text-subtle"}`}>{b}</td>
    </>
  );
}

export default async function ComparePage(props: { params: Promise<{ pair: string }> }) {
  const { pair } = await props.params;
  const ids = parsePair(pair);
  if (!ids) notFound();

  const [a, b] = await Promise.all([getCard(ids[0]), getCard(ids[1])]);
  if (!a || !b || a.id === b.id) notFound();

  const rateA = topRate(a), rateB = topRate(b);
  const feeA = a.annualFee ?? 0, feeB = b.annualFee ?? 0;
  const catsA = cardCategories(a), catsB = cardCategories(b);

  const rateWin = rateA === rateB ? "tie" : rateA > rateB ? "a" : "b";
  // Lower fee is better.
  const feeWin = feeA === feeB ? "tie" : feeA < feeB ? "a" : "b";

  const rows: { label: string; a: string; b: string; winner?: "a" | "b" | "tie" }[] = [
    { label: "Top reward rate", a: `${rateA}%`, b: `${rateB}%`, winner: rateWin },
    { label: "Annual fee", a: formatFee(a), b: formatFee(b), winner: feeWin },
    {
      label: "Fee waiver spend",
      a: a.feeWaiverSpend ? `₹${a.feeWaiverSpend.toLocaleString("en-IN")}/yr` : "—",
      b: b.feeWaiverSpend ? `₹${b.feeWaiverSpend.toLocaleString("en-IN")}/yr` : "—",
    },
    { label: "Reward type", a: TYPE_LABEL[a.type], b: TYPE_LABEL[b.type] },
    { label: "Network", a: a.network, b: b.network },
    { label: "Base rate", a: `${a.baseRate}%`, b: `${b.baseRate}%` },
    {
      label: "Bonus categories",
      a: catsA.length ? `${catsA.length}` : "—",
      b: catsB.length ? `${catsB.length}` : "—",
    },
    {
      label: "Fuel surcharge waiver",
      a: a.fuelSurchargeWaiver ? "✅ Yes" : "—",
      b: b.fuelSurchargeWaiver ? "✅ Yes" : "—",
    },
  ];

  // Verdict
  const verdict =
    rateWin === "tie"
      ? `Dono cards similar top reward dete hain (${rateA}%). Faisla annual fee aur aapki spending categories pe karo.`
      : `${(rateWin === "a" ? a : b).name} zyada top reward (${Math.max(rateA, rateB)}%) deta hai, jabki ${(feeWin === "a" ? a : b).name} ki fee kam hai. Aapki sabse zyada spending jis category mein ho, usi ke hisaab se choose karo.`;

  const faqs = [
    {
      q: `${a.name} ya ${b.name} — kaunsa behtar hai?`,
      a: verdict,
    },
    {
      q: `${a.name} aur ${b.name} ki annual fee kitni hai?`,
      a: `${a.name} ki annual fee ${formatFee(a)} hai aur ${b.name} ki ${formatFee(b)}.`,
    },
    {
      q: `Inme se zyada reward kaun deta hai?`,
      a:
        rateWin === "tie"
          ? `Dono ka top reward rate ${rateA}% hai.`
          : `${(rateWin === "a" ? a : b).name} ka top reward rate ${Math.max(rateA, rateB)}% hai, jo ${(rateWin === "a" ? b : a).name} (${Math.min(rateA, rateB)}%) se zyada hai.`,
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
        name: `${a.name} vs ${b.name}`,
        item: `https://cardwiz.in/compare/${pair}`,
      },
    ],
  };

  return (
    <div className="mx-auto max-w-4xl px-5 py-10">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(faqLd) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbLd) }} />

      <nav className="text-xs text-muted">
        <Link href="/" className="hover:text-subtle">Home</Link> ·{" "}
        <Link href="/cards" className="hover:text-subtle">Cards</Link> ·{" "}
        <span className="text-subtle">{a.name} vs {b.name}</span>
      </nav>

      <h1 className="mt-4 text-2xl font-black sm:text-3xl">
        {a.name} <span className="text-muted">vs</span> {b.name}
      </h1>
      <p className="mt-2 text-sm text-subtle">{a.bank} vs {b.bank} · {YEAR} comparison</p>

      {/* Comparison table */}
      <div className="mt-8 overflow-x-auto rounded-2xl border border-border">
        <table className="w-full border-collapse">
          <thead>
            <tr className="border-b border-border bg-surface2">
              <th className="px-4 py-3 text-left text-xs font-bold uppercase tracking-wide text-muted"> </th>
              <th className="px-4 py-3 text-left text-sm font-black">{a.name}</th>
              <th className="px-4 py-3 text-left text-sm font-black">{b.name}</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r, i) => (
              <tr key={r.label} className={i % 2 ? "bg-surface2/40" : ""}>
                <td className="px-4 py-3 text-xs font-semibold text-muted">{r.label}</td>
                <Cell a={r.a} b={r.b} winner={r.winner} />
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Verdict */}
      <div className="mt-6 rounded-2xl border border-accent bg-surface2 p-5">
        <h2 className="font-extrabold">Verdict</h2>
        <p className="mt-1.5 text-sm leading-relaxed text-subtle">{verdict}</p>
        <div className="mt-4 flex flex-wrap gap-3">
          <Link href={`/cards/${a.id}`} className="rounded-lg border border-border px-4 py-2 text-sm font-bold text-accent hover:border-accent">
            {a.name} detail →
          </Link>
          <Link href={`/cards/${b.id}`} className="rounded-lg border border-border px-4 py-2 text-sm font-bold text-accent hover:border-accent">
            {b.name} detail →
          </Link>
        </div>
      </div>

      {/* Category breakdown */}
      <div className="mt-8 grid gap-4 sm:grid-cols-2">
        {[a, b].map((c) => (
          <div key={c.id} className="rounded-2xl border border-border bg-surface2 p-5">
            <div className="font-bold">{c.name}</div>
            <div className="mt-1 text-xs text-muted">Bonus categories</div>
            <div className="mt-2 flex flex-wrap gap-1.5">
              {cardCategories(c).slice(0, 10).map((cat) => (
                <span key={cat} className="rounded-full border border-border bg-surface px-2.5 py-0.5 text-[11px] text-subtle">
                  {prettyCategory(cat)}
                </span>
              ))}
              {cardCategories(c).length === 0 && <span className="text-xs text-muted">Base rate only</span>}
            </div>
          </div>
        ))}
      </div>

      {/* CTA */}
      <div className="mt-10 rounded-2xl border border-border bg-surface2 p-5 text-center">
        <p className="text-sm text-subtle">Abhi bhi confused? Apni spending batao, AI dono mein se best suggest karega.</p>
        <Link href="/ai" className="mt-3 inline-block rounded-xl bg-accent px-6 py-3 text-sm font-bold text-onaccent hover:bg-blue">
          🤖 AI se poocho
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

      {/* Other comparisons */}
      <section className="mt-12">
        <h2 className="text-lg font-extrabold">Aur comparisons</h2>
        <div className="mt-4 flex flex-wrap gap-2">
          <OtherPairs cards={await getCards()} current={pair} />
        </div>
      </section>
    </div>
  );
}

async function OtherPairs({ cards, current }: { cards: Card[]; current: string }) {
  const byId = new Map(cards.map((c) => [c.id, c]));
  return (
    <>
      {COMPARE_PAIRS.filter((p) => pairToSlug(p[0], p[1]) !== current)
        .slice(0, 8)
        .map(([x, y]) => {
          const cx = byId.get(x), cy = byId.get(y);
          if (!cx || !cy) return null;
          return (
            <Link
              key={`${x}-${y}`}
              href={`/compare/${pairToSlug(x, y)}`}
              className="rounded-full border border-border bg-surface px-3.5 py-1.5 text-xs text-subtle transition-colors hover:border-accent hover:text-fg"
            >
              {cx.name} vs {cy.name}
            </Link>
          );
        })}
    </>
  );
}
