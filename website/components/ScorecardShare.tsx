"use client";

import { useState } from "react";
import { track } from "@vercel/analytics";

export default function ScorecardShare({
  earned,
  missed,
  eff,
  period,
  name,
}: {
  earned: number;
  missed: number;
  eff: number;
  period: string;
  name?: string;
}) {
  const [busy, setBusy] = useState(false);

  function ogUrl(): string {
    const p = new URLSearchParams({
      earned: String(Math.round(earned)),
      missed: String(Math.round(missed)),
      eff: String(eff),
      period,
    });
    if (name) p.set("name", name);
    return `/scorecard/og?${p.toString()}`;
  }

  async function share() {
    track("scorecard_share");
    const url = ogUrl();
    try {
      setBusy(true);
      const res = await fetch(url);
      const blob = await res.blob();
      const file = new File([blob], "cardwiz-scorecard.png", { type: "image/png" });
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const nav = navigator as any;
      if (nav.canShare && nav.canShare({ files: [file] })) {
        await nav.share({
          files: [file],
          title: "My CardWiz Savings Scorecard",
          text: `${period}: ₹${Math.round(earned).toLocaleString("en-IN")} earned in card rewards 💳`,
        });
        return;
      }
      window.open(url, "_blank", "noopener"); // fallback: open image to save/share
    } catch {
      window.open(ogUrl(), "_blank", "noopener");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="rounded-2xl border border-accent/30 bg-accent/5 p-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <div className="text-xs font-bold uppercase tracking-wide text-accent">Savings Scorecard</div>
          <div className="mt-1 text-lg font-black">
            {period}:{" "}
            <span className="text-green-400">₹{Math.round(earned).toLocaleString("en-IN")} earned</span>
            <span className="text-muted"> · {eff}% efficient</span>
          </div>
        </div>
        <button
          onClick={share}
          disabled={busy}
          className="shrink-0 rounded-xl bg-accent px-4 py-2 text-sm font-bold text-onaccent transition-colors hover:bg-blue disabled:opacity-50"
        >
          {busy ? "…" : "📤 Share"}
        </button>
      </div>
    </div>
  );
}
