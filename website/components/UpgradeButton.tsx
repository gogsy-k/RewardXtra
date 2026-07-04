"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { track } from "@vercel/analytics";
import { useAuth } from "@/contexts/AuthContext";
import { useLang } from "@/contexts/LangContext";
import { startSubscription, verifySubscription } from "@/lib/payment-api";

type State = "idle" | "starting" | "waiting" | "done" | "error";

/**
 * Real Razorpay upgrade for the Premium plan. Signed-out → sign-in gate;
 * already-premium → status pill; else create subscription, open the hosted pay
 * page, and poll verify until the mandate is authorized. No card data touches us.
 */
export default function UpgradeButton({
  period,
  tier = "premium",
  className = "",
}: {
  period: "monthly" | "yearly";
  tier?: "premium" | "pro";
  className?: string;
}) {
  const { user, loading } = useAuth();
  // Pro includes Premium, so a Premium button is "owned" by a pro user too.
  const owns = !!user && (user.plan === tier || (tier === "premium" && user.plan === "pro"));
  const { t } = useLang();
  const [state, setState] = useState<State>("idle");
  const [err, setErr] = useState("");
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const stop = () => {
    if (pollRef.current) clearInterval(pollRef.current);
    pollRef.current = null;
  };
  useEffect(() => stop, []);

  const base = "block w-full rounded-xl px-5 py-3 text-center text-sm font-bold transition-colors";

  async function poll(once = false) {
    try {
      const r = await verifySubscription();
      if (r.status === "active") {
        stop();
        setState("done");
      }
    } catch {
      /* network blip — keep waiting */
    }
    if (once) return;
  }

  function startPolling() {
    stop();
    let tries = 0;
    pollRef.current = setInterval(() => {
      tries += 1;
      void poll();
      if (tries >= 40) stop(); // ~3.5 min then rely on the manual check button
    }, 5000);
  }

  async function upgrade() {
    setErr("");
    setState("starting");
    // Open the tab synchronously (in the click) so popup blockers allow it.
    const win = window.open("", "_blank");
    try {
      track("upgrade_click", { period, tier });
      const { shortUrl } = await startSubscription(period, tier);
      if (win) win.location.href = shortUrl;
      else window.location.href = shortUrl;
      setState("waiting");
      startPolling();
    } catch (e) {
      if (win) win.close();
      setErr((e as Error).message);
      setState("error");
    }
  }

  // --- render states ---
  if (owns) {
    // Exact plan → "You're on Premium/Pro"; Premium card while on Pro → "Included in Pro".
    const label =
      user!.plan === tier
        ? tier === "pro"
          ? t("pay_on_pro")
          : t("pay_already")
        : t("pay_included_pro");
    return (
      <div className={`${base} border border-green/40 bg-green/10 text-green ${className}`}>
        ✓ {label}
      </div>
    );
  }

  if (!loading && !user) {
    return (
      <Link href="/sign-in" className={`${base} bg-accent text-onaccent hover:bg-blue ${className}`}>
        {t("pay_signin")}
      </Link>
    );
  }

  if (state === "done") {
    return (
      <div className={`${base} border border-green/40 bg-green/10 text-green ${className}`}>
        🎉 {t("pay_done")}{" "}
        <button onClick={() => window.location.reload()} className="underline">
          {t("pay_refresh")}
        </button>
      </div>
    );
  }

  if (state === "waiting") {
    return (
      <div className={className}>
        <button onClick={() => poll(true)} className={`${base} bg-accent text-onaccent hover:bg-blue`}>
          {t("pay_check")}
        </button>
        <p className="mt-1.5 text-center text-xs text-muted">{t("pay_waiting")}</p>
      </div>
    );
  }

  return (
    <div className={className}>
      <button
        onClick={upgrade}
        disabled={state === "starting"}
        className={`${base} bg-accent text-onaccent hover:bg-blue disabled:opacity-60`}
      >
        {state === "starting" ? t("pay_starting") : t(tier === "pro" ? "pay_upgrade_pro" : "pay_upgrade")}
      </button>
      {state === "error" && <p className="mt-1.5 text-center text-xs text-pink">{err}</p>}
    </div>
  );
}
