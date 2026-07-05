"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { getOffers, type Offer } from "@/lib/offers-api";

function fmtDate(d: string) {
  return new Date(d).toLocaleDateString("en-IN", { day: "numeric", month: "short" });
}

export default function CardOffers({ cardId, bank }: { cardId: string; bank?: string }) {
  const [offers, setOffers] = useState<Offer[]>([]);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    // Fetch by cardId first, then by bank if cardId has no results
    getOffers({ cardId }).then(async (list) => {
      if (list.length === 0 && bank) {
        const byBank = await getOffers({ bank });
        setOffers(byBank.slice(0, 5));
      } else {
        setOffers(list.slice(0, 5));
      }
      setLoaded(true);
    });
  }, [cardId, bank]);

  if (!loaded || offers.length === 0) return null;

  return (
    <section className="space-y-3">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-black">Bank Offers</h2>
        <Link href="/offers" className="text-xs text-accent hover:underline">See all →</Link>
      </div>
      <div className="space-y-2">
        {offers.map((o) => {
          const expired = o.validUntil && new Date(o.validUntil) < new Date();
          return (
            <div key={o.id}
              className={`rounded-xl border bg-surface2 px-4 py-3 ${expired ? "opacity-50 border-border" : "border-border"}`}>
              <div className="text-sm font-semibold">{o.title}</div>
              <div className="text-xs text-accent font-semibold mt-0.5">{o.discountText}</div>
              <div className="flex gap-3 mt-1 text-xs text-muted">
                <span>🏪 {o.merchant}</span>
                {o.validUntil && (
                  <span className={expired ? "text-red-400" : ""}>
                    📅 {expired ? "Expired" : `Till ${fmtDate(o.validUntil)}`}
                  </span>
                )}
              </div>
            </div>
          );
        })}
      </div>
      <Link href="/offers" className="inline-block text-xs text-muted hover:text-accent">
        + Submit a new offer for this card →
      </Link>
    </section>
  );
}
