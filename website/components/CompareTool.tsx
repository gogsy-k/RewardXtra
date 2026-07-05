"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { track } from "@vercel/analytics";
import { TYPE_LABEL, prettyCategory, type Card } from "@/lib/cards";

export type CompareCard = {
  id: string;
  name: string;
  bank: string;
  network: string;
  type: Card["type"];
  cardType: Card["cardType"];
  topRate: number;
  baseRate: number;
  annualFee: number;
  feeWaiverSpend: number;
  categories: string[];
  fuelSurchargeWaiver: boolean;
};

const MAX = 3;
const fmtFee = (n: number) => (n === 0 ? "Lifetime Free" : `₹${n.toLocaleString("en-IN")}/yr`);

export default function CompareTool({ cards }: { cards: CompareCard[] }) {
  const [query, setQuery] = useState("");
  const [selectedIds, setSelectedIds] = useState<string[]>([]);

  const byId = useMemo(() => new Map(cards.map((c) => [c.id, c])), [cards]);
  const selected = selectedIds.map((id) => byId.get(id)!).filter(Boolean);

  const matches = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return [];
    return cards
      .filter((c) => `${c.name} ${c.bank} ${c.network}`.toLowerCase().includes(q))
      .filter((c) => !selectedIds.includes(c.id))
      .slice(0, 6);
  }, [query, cards, selectedIds]);

  function add(id: string) {
    if (selectedIds.length >= MAX || selectedIds.includes(id)) return;
    setSelectedIds((prev) => [...prev, id]);
    setQuery("");
    track("compare_add");
  }
  function remove(id: string) {
    setSelectedIds((prev) => prev.filter((x) => x !== id));
  }

  // Winners for highlighting.
  const maxRate = Math.max(...selected.map((c) => c.topRate), 0);
  const minFee = selected.length ? Math.min(...selected.map((c) => c.annualFee)) : 0;

  const rows: { label: string; render: (c: CompareCard) => React.ReactNode; win?: (c: CompareCard) => boolean }[] = [
    { label: "Top reward rate", render: (c) => `${c.topRate}%`, win: (c) => selected.length > 1 && c.topRate === maxRate && maxRate > 0 },
    { label: "Annual fee", render: (c) => fmtFee(c.annualFee), win: (c) => selected.length > 1 && c.annualFee === minFee },
    { label: "Fee waiver spend", render: (c) => (c.feeWaiverSpend ? `₹${c.feeWaiverSpend.toLocaleString("en-IN")}/yr` : "—") },
    { label: "Reward type", render: (c) => TYPE_LABEL[c.type] },
    { label: "Network", render: (c) => c.network },
    { label: "Base rate", render: (c) => `${c.baseRate}%` },
    { label: "Bonus categories", render: (c) => (c.categories.length ? `${c.categories.length}` : "—") },
    { label: "Fuel surcharge waiver", render: (c) => (c.fuelSurchargeWaiver ? "✅ Yes" : "—") },
  ];

  return (
    <div>
      {/* Picker */}
      <div className="rounded-2xl border border-border bg-surface2 p-4">
        <label htmlFor="compare-search" className="block text-xs font-semibold text-subtle">
          Card add karo ({selectedIds.length}/{MAX})
        </label>
        <input
          id="compare-search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          disabled={selectedIds.length >= MAX}
          placeholder={selectedIds.length >= MAX ? "Max 3 cards — ek hatao pehle" : "Search — 'HDFC', 'Amazon', 'cashback'…"}
          className="mt-1.5 w-full rounded-xl border border-border bg-surface px-3 py-2.5 text-sm text-fg outline-none placeholder:text-muted focus:border-accent disabled:opacity-50"
        />
        {matches.length > 0 && (
          <ul className="mt-2 divide-y divide-border overflow-hidden rounded-xl border border-border">
            {matches.map((c) => (
              <li key={c.id}>
                <button
                  type="button"
                  onClick={() => add(c.id)}
                  className="flex w-full items-center justify-between gap-3 bg-surface px-3 py-2 text-left transition-colors hover:bg-surface2"
                >
                  <span className="min-w-0">
                    <span className="block truncate text-sm font-semibold">{c.name}</span>
                    <span className="block text-[11px] text-muted">{c.bank} · {c.network}</span>
                  </span>
                  <span className="shrink-0 text-xs font-bold text-accent">+ Add</span>
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>

      {/* Selected chips */}
      {selected.length > 0 && (
        <div className="mt-3 flex flex-wrap gap-2">
          {selected.map((c) => (
            <span key={c.id} className="inline-flex items-center gap-1.5 rounded-full border border-accent/40 bg-surface2 px-3 py-1 text-xs font-semibold">
              {c.name}
              <button type="button" onClick={() => remove(c.id)} aria-label={`Remove ${c.name}`} className="text-pink hover:opacity-70">×</button>
            </span>
          ))}
        </div>
      )}

      {/* Comparison table / empty state */}
      {selected.length < 2 ? (
        <div className="mt-6 flex flex-col items-center rounded-2xl border border-dashed border-border py-14 text-center">
          <div className="text-4xl">⚖️</div>
          <p className="mt-3 text-sm text-subtle">
            {selected.length === 0 ? "Compare karne ke liye 2 cards search karke add karo." : "Ek aur card add karo comparison ke liye."}
          </p>
        </div>
      ) : (
        <div className="mt-6 overflow-x-auto rounded-2xl border border-border">
          <table className="w-full border-collapse">
            <thead>
              <tr className="border-b border-border bg-surface2">
                <th className="px-4 py-3 text-left text-xs font-bold uppercase tracking-wide text-muted"> </th>
                {selected.map((c) => (
                  <th key={c.id} className="px-4 py-3 text-left">
                    <Link href={`/cards/${c.id}`} className="text-sm font-black hover:text-accent">{c.name}</Link>
                    <div className="text-[11px] font-normal text-muted">{c.bank}</div>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rows.map((r, i) => (
                <tr key={r.label} className={i % 2 ? "bg-surface2/40" : ""}>
                  <td className="px-4 py-3 text-xs font-semibold text-muted">{r.label}</td>
                  {selected.map((c) => (
                    <td key={c.id} className={`px-4 py-3 text-sm ${r.win?.(c) ? "font-bold text-green" : "text-subtle"}`}>
                      {r.render(c)}
                    </td>
                  ))}
                </tr>
              ))}
              {/* Category chips row */}
              <tr>
                <td className="px-4 py-3 align-top text-xs font-semibold text-muted">Categories</td>
                {selected.map((c) => (
                  <td key={c.id} className="px-4 py-3 align-top">
                    <div className="flex flex-wrap gap-1">
                      {c.categories.slice(0, 6).map((cat) => (
                        <span key={cat} className="rounded-full border border-border bg-surface px-2 py-0.5 text-[10px] text-subtle">
                          {prettyCategory(cat)}
                        </span>
                      ))}
                      {c.categories.length === 0 && <span className="text-xs text-muted">Base rate only</span>}
                    </div>
                  </td>
                ))}
              </tr>
            </tbody>
          </table>
        </div>
      )}

      <div className="mt-6 text-center">
        <Link href="/ai" className="text-sm font-bold text-accent hover:underline">
          Confused? AI se poocho kaunsa behtar hai →
        </Link>
      </div>
    </div>
  );
}
