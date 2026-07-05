"use client";

import { useState } from "react";
import { cardLogoUrl, monogram } from "@/lib/bank-logos";

/**
 * Bank / card-brand logo chip. Resolves the fintech brand (by card name) first,
 * then the issuing bank; on load error or when we have no logo, falls back to a
 * monogram — so it degrades to the original design instead of a broken image.
 */
export default function BankLogo({
  bank,
  name = "",
  size = 36,
  className = "",
}: {
  bank: string;
  name?: string;
  size?: number;
  className?: string;
}) {
  const [failed, setFailed] = useState(false);
  const url = cardLogoUrl(name, bank);
  const box = {
    width: size,
    height: size,
  } as const;

  if (!url || failed) {
    return (
      <span
        style={box}
        className={`flex shrink-0 items-center justify-center rounded-lg border border-border bg-surface text-[11px] font-black text-accent ${className}`}
      >
        {monogram(bank)}
      </span>
    );
  }

  const inner = Math.round(size * 0.62);
  return (
    <span
      style={box}
      className={`flex shrink-0 items-center justify-center overflow-hidden rounded-lg border border-border bg-white ${className}`}
    >
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={url}
        alt={`${bank} logo`}
        width={inner}
        height={inner}
        loading="lazy"
        onError={() => setFailed(true)}
        style={{ width: inner, height: inner, objectFit: "contain" }}
      />
    </span>
  );
}
