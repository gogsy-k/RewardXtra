"use client";

import Link from "next/link";
import { useLang } from "@/contexts/LangContext";
import BrandMark from "@/components/BrandMark";

const legal = [
  { href: "/privacy", label: "Privacy" },
  { href: "/terms", label: "Terms" },
  { href: "/refunds", label: "Refunds" },
  { href: "/shipping", label: "Shipping" },
  { href: "/contact", label: "Contact" },
];

export default function Footer() {
  const { t } = useLang();

  return (
    <footer className="mt-auto border-t border-border">
      <div className="mx-auto flex max-w-6xl flex-col gap-4 px-5 py-7 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-2 text-sm text-subtle">
          <BrandMark className="h-5 w-5 shrink-0" size={20} />
          <span>
            <span className="font-bold text-accent">CardWiz</span> &nbsp;·&nbsp;{" "}
            {t("footer_tagline")}
          </span>
        </div>
        <div className="flex flex-wrap gap-x-5 gap-y-2 text-sm">
          {legal.map((l) => (
            <Link key={l.href} href={l.href} className="text-muted hover:text-subtle">
              {l.label}
            </Link>
          ))}
        </div>
      </div>
      <div className="border-t border-border/50 px-5 py-3 text-center text-xs text-muted">
        © {new Date().getFullYear()} CardWiz · {t("footer_no_cvv")}
        <span className="mt-1 block">{t("aff_disclosure")}</span>
      </div>
    </footer>
  );
}
