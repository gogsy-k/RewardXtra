"use client";

import { useState } from "react";
import Link from "next/link";
import { useAuth } from "@/contexts/AuthContext";
import { useLang } from "@/contexts/LangContext";
import GoogleSignIn from "@/components/GoogleSignIn";

export default function AuthButton() {
  const { user, loading, signOut } = useAuth();
  const { t } = useLang();
  const [open, setOpen] = useState(false);

  if (loading) {
    return <div className="h-8 w-8 animate-pulse rounded-full bg-surface2" aria-hidden />;
  }

  const planLabel = (plan: "free" | "premium" | "pro") =>
    plan === "pro" ? "Pro" : plan === "premium" ? t("auth_plan_premium") : t("auth_plan_free");

  // ---- Signed in: avatar + name + plan, dropdown with sign out ----
  if (user) {
    const firstName = user.name?.split(" ")[0] || user.email;
    return (
      <div className="relative">
        <button
          onClick={() => setOpen((o) => !o)}
          className="flex items-center gap-2 rounded-full border border-border bg-surface2 py-1 pl-1 pr-2.5 transition-colors hover:border-accent"
        >
          <Avatar user={user} size={26} />
          <span className="hidden text-sm font-semibold sm:block">{firstName}</span>
          <PlanPill plan={user.plan} label={planLabel(user.plan)} />
        </button>

        {open && (
          <>
            <button
              className="fixed inset-0 z-40 cursor-default"
              aria-label="Close"
              onClick={() => setOpen(false)}
            />
            <div className="absolute right-0 z-50 mt-2 w-60 rounded-xl border border-border bg-surface2 p-3 shadow-2xl">
              <div className="flex items-center gap-2.5">
                <Avatar user={user} size={38} />
                <div className="min-w-0">
                  <div className="truncate text-sm font-bold">{user.name}</div>
                  <div className="truncate text-xs text-muted">{user.email}</div>
                </div>
              </div>
              <div className="mt-2.5">
                <PlanPill plan={user.plan} label={planLabel(user.plan)} />
              </div>

              {/* Account navigation (moved here from the navbar) */}
              <div className="mt-3 space-y-0.5 border-t border-border pt-2">
                <Link
                  href="/account"
                  onClick={() => setOpen(false)}
                  className="flex items-center gap-2 rounded-lg px-2.5 py-2 text-sm font-semibold text-fg transition-colors hover:bg-surface"
                >
                  <span>👤</span> {t("nav_account")}
                </Link>
                <Link
                  href="/account/rewards"
                  onClick={() => setOpen(false)}
                  className="flex items-center gap-2 rounded-lg px-2.5 py-2 text-sm font-semibold text-fg transition-colors hover:bg-surface"
                >
                  <span>🪙</span> {t("rw_h")}
                </Link>
                {user.isAdmin && (
                  <Link
                    href="/admin"
                    onClick={() => setOpen(false)}
                    className="flex items-center gap-2 rounded-lg px-2.5 py-2 text-sm font-semibold text-pink transition-colors hover:bg-surface"
                  >
                    <span>🛠️</span> {t("nav_admin")}
                  </Link>
                )}
              </div>

              <button
                onClick={() => {
                  signOut();
                  setOpen(false);
                }}
                className="mt-1.5 w-full rounded-lg border border-border py-2 text-sm font-semibold text-pink transition-colors hover:border-pink/50"
              >
                {t("auth_signout")}
              </button>
            </div>
          </>
        )}
      </div>
    );
  }

  // ---- Signed out: "Sign in" → popover with the Google button ----
  return (
    <div className="relative">
      <button
        onClick={() => setOpen((o) => !o)}
        className="rounded-lg border border-border px-3.5 py-1.5 text-sm font-semibold text-accent transition-colors hover:border-accent"
      >
        {t("auth_signin")}
      </button>

      {open && (
        <>
          <button
            className="fixed inset-0 z-40 cursor-default"
            aria-label="Close"
            onClick={() => setOpen(false)}
          />
          <div className="absolute right-0 z-50 mt-2 w-64 rounded-xl border border-border bg-surface2 p-4 shadow-2xl">
            <p className="mb-3 text-xs leading-relaxed text-muted">{t("auth_blurb")}</p>
            <div className="flex justify-center">
              <GoogleSignIn onSignedIn={() => setOpen(false)} />
            </div>
          </div>
        </>
      )}
    </div>
  );
}

function PlanPill({ plan, label }: { plan: "free" | "premium" | "pro"; label: string }) {
  return (
    <span
      className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${
        plan === "premium" || plan === "pro" ? "bg-accent text-onaccent" : "border border-border text-subtle"
      }`}
    >
      {label}
    </span>
  );
}

function Avatar({ user, size }: { user: { picture: string; name: string }; size: number }) {
  const initial = (user.name || "?").charAt(0).toUpperCase();
  if (user.picture) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={user.picture}
        alt=""
        width={size}
        height={size}
        referrerPolicy="no-referrer"
        className="rounded-full"
        style={{ width: size, height: size }}
      />
    );
  }
  return (
    <span
      className="flex items-center justify-center rounded-full bg-accent font-bold text-onaccent"
      style={{ width: size, height: size, fontSize: size * 0.45 }}
    >
      {initial}
    </span>
  );
}
