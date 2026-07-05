import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import {
  getCard,
  getCards,
  topRate,
  formatFee,
  TYPE_LABEL,
  prettyCategory,
} from "@/lib/cards";
import CardReviews from "@/components/CardReviews";
import CardOffers from "@/components/CardOffers";
import NotifyCTA from "@/components/NotifyCTA";
import CardDetailHeader from "@/components/CardDetailHeader";
import Reveal from "@/components/motion/Reveal";
import JsonLd from "@/components/JsonLd";
import { cardApplyUrl } from "@/lib/affiliate";

export async function generateStaticParams() {
  const cards = await getCards();
  return cards.map((c) => ({ id: c.id }));
}

export async function generateMetadata(props: PageProps<"/cards/[id]">): Promise<Metadata> {
  const { id } = await props.params;
  const card = await getCard(id);
  if (!card) return { title: "Card not found" };
  return {
    title: `${card.name} — rewards, fees & benefits`,
    description: `${card.name} (${card.bank}) ki poori detail — top ${topRate(card)}% reward, annual fee ${formatFee(card)}, ${TYPE_LABEL[card.type]}. Categories aur reward rates compare karo CardWiz pe.`,
  };
}

export default async function CardDetail(props: PageProps<"/cards/[id]">) {
  const { id } = await props.params;
  const card = await getCard(id);
  if (!card) notFound();

  const all = await getCards();
  const related = all
    .filter((c) => c.bank === card.bank && c.id !== card.id)
    .slice(0, 3);

  const stats = [
    { value: `${topRate(card)}%`, label: "Top reward rate", countTo: topRate(card), suffix: "%" },
    { value: formatFee(card), label: "Annual fee" },
    { value: TYPE_LABEL[card.type], label: "Reward type" },
    { value: card.network, label: "Network" },
  ];

  const applyHref = cardApplyUrl(card.bank, card.id);

  return (
    <div className="mx-auto max-w-4xl px-5 py-10">
      <JsonLd
        data={{
          "@context": "https://schema.org",
          "@type": "CreditCard",
          name: card.name,
          url: `https://cardwiz.in/cards/${card.id}`,
          provider: { "@type": "BankOrCreditUnion", name: card.bank },
          description: `${card.name} by ${card.bank} — top ${topRate(card)}% reward rate, annual fee ${formatFee(card)}. ${TYPE_LABEL[card.type]} card on ${card.network}.`,
          feesAndCommissionsSpecification: `Annual fee: ${formatFee(card)}`,
          category: TYPE_LABEL[card.type],
          areaServed: "IN",
        }}
      />
      <JsonLd
        data={{
          "@context": "https://schema.org",
          "@type": "BreadcrumbList",
          itemListElement: [
            { "@type": "ListItem", position: 1, name: "Home", item: "https://cardwiz.in/" },
            { "@type": "ListItem", position: 2, name: "Cards", item: "https://cardwiz.in/cards" },
            { "@type": "ListItem", position: 3, name: card.name, item: `https://cardwiz.in/cards/${card.id}` },
          ],
        }}
      />
      <Link href="/cards" className="text-sm text-muted hover:text-subtle">
        ← All cards
      </Link>

      {/* Header */}
      <CardDetailHeader
        cardType={card.cardType}
        bank={card.bank}
        network={card.network}
        name={card.name}
        stats={stats}
        feeWaiverSpend={card.feeWaiverSpend}
      />

      {/* Apply CTA — links to the bank's official page; affiliate-tracked once a
          network link-wrap base is configured in lib/affiliate.ts. */}
      {applyHref && (
        <a
          href={applyHref}
          target="_blank"
          rel="sponsored noopener noreferrer"
          className="mt-6 flex items-center justify-center gap-2 rounded-xl bg-accent px-5 py-3 text-sm font-bold text-onaccent transition-colors hover:bg-blue"
        >
          Apply for this card ↗
        </a>
      )}

      {/* Reward rules */}
      <h2 className="mt-10 text-xl font-extrabold">Reward rates</h2>
      <div className="mt-4 space-y-3">
        {card.rules.map((rule, i) => (
          <Reveal key={i} delay={i * 0.04}>
            <div className="rounded-xl border border-border bg-surface2 p-4">
              <div className="flex items-start justify-between gap-4">
                <div className="flex flex-wrap gap-1.5">
                  {rule.categories.map((c) => (
                    <span
                      key={c}
                      className="rounded-full border border-border bg-surface px-2.5 py-0.5 text-[11px] text-subtle"
                    >
                      {prettyCategory(c)}
                    </span>
                  ))}
                </div>
                <span className="shrink-0 text-lg font-black text-green tabular-nums">
                  {rule.effectiveRate}%
                </span>
              </div>
              <p className="mt-2 text-sm text-muted">{rule.rawRate}</p>
              {rule.monthlyCapValue && (
                <p className="mt-1 text-xs text-yellow">
                  Monthly cap: ₹{rule.monthlyCapValue.toLocaleString("en-IN")} reward
                </p>
              )}
            </div>
          </Reveal>
        ))}
        {/* Base rate */}
        <div className="rounded-xl border border-dashed border-border p-4">
          <div className="flex items-center justify-between">
            <span className="text-sm text-subtle">Baaki sabhi spends (base rate)</span>
            <span className="text-lg font-black text-subtle tabular-nums">{card.baseRate}%</span>
          </div>
        </div>
      </div>

      {/* Exclusions */}
      {card.exclusions.length > 0 && (
        <>
          <h2 className="mt-10 text-xl font-extrabold">Reward nahi milta in pe</h2>
          <div className="mt-3 flex flex-wrap gap-2">
            {card.exclusions.map((e) => (
              <span
                key={e}
                className="rounded-full border border-pink/40 bg-surface px-3 py-1 text-xs text-pink"
              >
                {prettyCategory(e)}
              </span>
            ))}
          </div>
        </>
      )}

      {/* CTA */}
      <div className="mt-10 rounded-2xl border border-border bg-surface2 p-6 text-center">
        <p className="text-sm text-subtle">
          Ye card aapke paas hai? CardWiz checkout pe automatically batayega ki kab is card se
          sabse zyada bachat hogi.
        </p>
        <div className="mt-4 flex justify-center">
          <NotifyCTA variant="primary" />
        </div>
      </div>

      {/* Related */}
      {related.length > 0 && (
        <>
          <h2 className="mt-12 text-xl font-extrabold">{card.bank} ke aur cards</h2>
          <div className="mt-4 grid gap-3 sm:grid-cols-3">
            {related.map((c) => (
              <Link
                key={c.id}
                href={`/cards/${c.id}`}
                className="rounded-xl border border-border bg-surface2 p-4 transition-colors hover:border-brand"
              >
                <div className="text-sm font-bold">{c.name}</div>
                <div className="mt-2 text-green">{topRate(c)}% top reward</div>
              </Link>
            ))}
          </div>
        </>
      )}

      {/* Bank Offers */}
      <div className="mt-12">
        <CardOffers cardId={id} bank={card.bank} />
      </div>

      {/* Reviews */}
      <div className="mt-12">
        <CardReviews cardId={id} />
      </div>

      {card.lastVerified && (
        <p className="mt-10 text-center text-xs text-muted">
          Data last verified: {card.lastVerified} · Offers bank ki terms pe depend karte hain,
          apne issuer se confirm karein.
        </p>
      )}
    </div>
  );
}
