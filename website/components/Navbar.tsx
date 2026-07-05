"use client";

import Link from "next/link";
import { useState } from "react";
import { usePathname } from "next/navigation";
import { motion } from "motion/react";
import { CreditCard, Menu, X } from "lucide-react";
import { useLang } from "@/contexts/LangContext";
import { useAuth } from "@/contexts/AuthContext";
import LanguageSwitcher from "@/components/LanguageSwitcher";
import AuthButton from "@/components/AuthButton";
import NotificationBell from "@/components/NotificationBell";
import { EXTENSION_PUBLISHED, CHROME_STORE_URL, INSTALL_CTA_KEY } from "@/lib/constants";

// Secondary CTA: when unpublished, link to the hero notify form; else straight to the store.
const NAV_CTA_HREF = EXTENSION_PUBLISHED ? CHROME_STORE_URL : "/#notify";

export default function Navbar() {
  const [open, setOpen] = useState(false);
  const { t } = useLang();
  const { user } = useAuth();
  const pathname = usePathname();

  const links = [
    { href: "/", key: "nav_home" },
    { href: "/cards", key: "nav_cards" },
    { href: "/find-my-card", key: "nav_findcard" },
    { href: "/ai", key: "nav_ai" },
    { href: "/offers", key: "nav_offers" },
    { href: "/news", key: "nav_news" },
    { href: "/pricing", key: "nav_pricing" },
  ];

  // Active link: "/" exact, nested routes ke liye prefix match.
  const isActive = (href: string) =>
    href === "/" ? pathname === "/" : pathname === href || pathname.startsWith(href + "/");

  return (
    <header className="sticky top-0 z-50 border-b border-border/70 bg-bg/70 backdrop-blur-xl">
      <nav className="flex w-full items-center justify-between gap-4 px-5 py-3 sm:px-8">
        {/* Logo */}
        <Link href="/" className="flex shrink-0 items-center gap-1.5 text-lg font-black tracking-tight">
          <CreditCard className="h-5 w-5 text-brand" strokeWidth={2.5} />
          <span className="text-brand">CardWiz</span>
        </Link>

        {/* Desktop nav — segmented pill with a sliding active indicator */}
        <div className="hidden items-center gap-0.5 rounded-full border border-border/60 bg-surface2/60 p-1 lg:flex">
          {links.map((l) => {
            const active = isActive(l.href);
            return (
              <Link
                key={l.href}
                href={l.href}
                aria-current={active ? "page" : undefined}
                className={`relative rounded-full px-3.5 py-1.5 text-sm transition-colors ${
                  active ? "font-bold text-brand" : "font-medium text-subtle hover:text-fg"
                }`}
              >
                {active && (
                  <motion.span
                    layoutId="nav-pill"
                    className="absolute inset-0 rounded-full bg-surface shadow-sm"
                    transition={{ type: "spring", stiffness: 380, damping: 32 }}
                  />
                )}
                <span className="relative z-10">{t(l.key)}</span>
              </Link>
            );
          })}
        </div>

        {/* Right cluster */}
        <div className="hidden shrink-0 items-center gap-2.5 lg:flex">
          <LanguageSwitcher compact />
          <NotificationBell />
          <AuthButton />
          <Link
            href={NAV_CTA_HREF}
            className="rounded-full bg-accent px-4 py-2 text-sm font-bold text-onaccent transition-colors hover:bg-blue"
          >
            {t(INSTALL_CTA_KEY)}
          </Link>
        </div>

        {/* Mobile: avatar + hamburger */}
        <div className="flex shrink-0 items-center gap-2 lg:hidden">
          <NotificationBell />
          <AuthButton />
          <button
            onClick={() => setOpen((v) => !v)}
            className="flex h-9 w-9 items-center justify-center rounded-lg border border-border text-subtle transition-colors hover:border-brand hover:text-fg"
            aria-label="Menu"
            aria-expanded={open}
          >
            {open ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </button>
        </div>
      </nav>

      {/* Mobile menu */}
      {open && (
        <div className="flex flex-col gap-1 border-t border-border bg-bg/95 px-5 py-3 lg:hidden">
          {links.map((l) => (
            <Link
              key={l.href}
              href={l.href}
              onClick={() => setOpen(false)}
              aria-current={isActive(l.href) ? "page" : undefined}
              className={`rounded-lg px-3 py-2.5 text-sm transition-colors ${
                isActive(l.href) ? "bg-surface font-bold text-brand" : "font-medium text-subtle hover:bg-surface hover:text-fg"
              }`}
            >
              {t(l.key)}
            </Link>
          ))}
          {user && (
            <Link
              href="/account"
              onClick={() => setOpen(false)}
              aria-current={isActive("/account") ? "page" : undefined}
              className={`rounded-lg px-3 py-2.5 text-sm transition-colors ${
                isActive("/account") ? "bg-surface font-bold text-brand" : "font-medium text-subtle hover:bg-surface hover:text-fg"
              }`}
            >
              {t("nav_account")}
            </Link>
          )}
          {user?.isAdmin && (
            <Link
              href="/admin"
              onClick={() => setOpen(false)}
              className="rounded-lg px-3 py-2.5 text-sm font-bold text-pink hover:bg-surface"
            >
              {t("nav_admin")}
            </Link>
          )}
          <div className="mt-2 flex items-center justify-between gap-3 border-t border-border px-1 pt-3">
            <LanguageSwitcher />
            <Link
              href={NAV_CTA_HREF}
              onClick={() => setOpen(false)}
              className="rounded-full bg-accent px-4 py-2 text-center text-sm font-bold text-onaccent"
            >
              {t(INSTALL_CTA_KEY)}
            </Link>
          </div>
        </div>
      )}
    </header>
  );
}
