"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useAuth } from "@/contexts/AuthContext";
import { useLang } from "@/contexts/LangContext";
import {
  getRewards, checkin, redeem, getLeaderboard,
  type RewardsResponse, type RedeemOption, type LeaderboardResponse,
} from "@/lib/rewards-api";

const EARN = [
  { icon: "⭐", key: "rw_earn_review", reason: "review", href: "/cards" },
  { icon: "🧾", key: "rw_earn_txn", reason: "transaction", href: "/account/transactions" },
  { icon: "🏷️", key: "rw_earn_offer", reason: "offer", href: "/offers" },
] as const;

export default function RewardsPage() {
  const { user } = useAuth();
  const { t } = useLang();
  const [data, setData] = useState<RewardsResponse | null>(null);
  const [lb, setLb] = useState<LeaderboardResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState<string | null>(null);
  const [toast, setToast] = useState<{ text: string; ok: boolean } | null>(null);

  useEffect(() => {
    getRewards().then(setData).catch(() => {}).finally(() => setLoading(false));
    getLeaderboard().then(setLb).catch(() => {});
  }, []);

  if (!user) return null; // layout handles the auth guard

  async function doCheckin() {
    if (!data || data.checkedInToday || busy) return;
    setBusy("checkin");
    try {
      const r = await checkin();
      setToast({
        text: r.gotBonus ? t("rw_bonus_toast", { n: 25 }) : t("rw_checkin_toast", { n: data.earnRates.checkin ?? 5 }),
        ok: true,
      });
      const fresh = await getRewards();
      setData(fresh);
    } catch {
      setToast({ text: "⚠️", ok: false });
    } finally {
      setBusy(null);
    }
  }

  async function doRedeem(opt: RedeemOption) {
    if (busy) return;
    setBusy(opt.id);
    try {
      await redeem(opt.id);
      setToast({ text: t("rw_redeem_ok"), ok: true });
      const fresh = await getRewards();
      setData(fresh);
    } catch (e) {
      const code = e instanceof Error ? e.message : "";
      setToast({ text: code === "active_plan" ? t("rw_redeem_active") : "⚠️", ok: false });
    } finally {
      setBusy(null);
    }
  }

  async function copyRefLink() {
    const link = `https://cardwiz.in/?ref=${user?.referralCode ?? ""}`;
    try {
      await navigator.clipboard.writeText(link);
      setToast({ text: t("rw_ref_copied"), ok: true });
    } catch {
      /* clipboard blocked — ignore */
    }
  }

  const points = data?.points ?? 0;
  const hasActiveSub = !!data && data.plan !== "free" && !data.planUntil;
  const fmtDate = (iso: string) =>
    new Date(iso).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" });

  return (
    <div className="mx-auto max-w-3xl space-y-6 px-5 py-10">
      {/* Header */}
      <div>
        <Link href="/account" className="text-xs text-muted hover:text-subtle">← Account</Link>
        <h1 className="mt-1 text-2xl font-black">🪙 {t("rw_h")}</h1>
        <p className="mt-0.5 text-sm text-muted">{t("rw_sub")}</p>
      </div>

      {/* Toast */}
      {toast && (
        <div
          className={`rounded-xl border px-4 py-2.5 text-sm font-semibold ${
            toast.ok ? "border-green/40 bg-green/10 text-green" : "border-pink/40 bg-pink/10 text-pink"
          }`}
        >
          {toast.text}
        </div>
      )}

      {/* Balance */}
      <div className="rounded-2xl border border-accent/30 bg-gradient-to-br from-accent/10 to-surface2 p-6 text-center">
        <div className="text-5xl font-black tabular-nums text-accent [text-shadow:0_0_24px_rgba(99,102,241,0.4)]">
          {loading ? "…" : points.toLocaleString("en-IN")}
        </div>
        <div className="mt-1 text-xs font-bold uppercase tracking-wide text-subtle">{t("rw_points")}</div>
        {data?.planUntil && (
          <div className="mt-4 inline-block rounded-full border border-green/40 bg-green/10 px-4 py-1.5 text-xs font-bold text-green">
            {t("rw_prem_until", { date: fmtDate(data.planUntil) })}
          </div>
        )}
      </div>

      {/* Daily check-in + streak */}
      <div className="flex items-center gap-4 rounded-2xl border border-border bg-surface2 p-4">
        <div className="text-4xl">🔥</div>
        <div className="min-w-0 flex-1">
          <div className="text-base font-black">
            {data && data.streak > 0 ? t("rw_streak", { n: data.streak }) : t("rw_streak0")}
          </div>
        </div>
        <button
          onClick={doCheckin}
          disabled={loading || !data || data.checkedInToday || busy === "checkin"}
          className={`shrink-0 rounded-full px-4 py-2 text-sm font-bold transition-colors ${
            data?.checkedInToday
              ? "cursor-default border border-border text-muted"
              : "bg-accent text-onaccent hover:bg-blue disabled:opacity-60"
          }`}
        >
          {data?.checkedInToday ? t("rw_checkin_done") : t("rw_checkin", { n: data?.earnRates.checkin ?? 5 })}
        </button>
      </div>

      {/* Redeem */}
      {!hasActiveSub && (
        <div>
          <h2 className="mb-3 text-lg font-black">{t("rw_redeem_h")}</h2>
          <div className="grid gap-2.5 sm:grid-cols-2">
            {(data?.redeemOptions ?? []).map((opt) => {
              const affordable = points >= opt.cost;
              return (
                <div key={opt.id} className="flex items-center justify-between gap-3 rounded-xl border border-border bg-surface2 p-4">
                  <div className="min-w-0">
                    <div className="text-sm font-bold">{t("rw_redeem_days", { n: opt.days })}</div>
                    <div className="text-xs font-semibold tabular-nums text-accent">{opt.cost.toLocaleString("en-IN")} pts</div>
                  </div>
                  <button
                    onClick={() => doRedeem(opt)}
                    disabled={!affordable || busy === opt.id}
                    className={`shrink-0 rounded-full px-3.5 py-1.5 text-xs font-bold transition-colors ${
                      affordable ? "bg-accent text-onaccent hover:bg-blue disabled:opacity-60" : "cursor-default border border-border text-muted"
                    }`}
                  >
                    {affordable ? t("rw_redeem_btn") : t("rw_redeem_need", { n: (opt.cost - points).toLocaleString("en-IN") })}
                  </button>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Refer friends */}
      <div className="rounded-2xl border border-pink/30 bg-gradient-to-br from-pink/10 to-surface2 p-5">
        <h2 className="text-base font-black">{t("rw_ref_h", { n: 100 })}</h2>
        <p className="mt-0.5 text-xs text-muted">{t("rw_ref_sub", { n: 100 })}</p>
        <div className="mt-3 flex items-center gap-2">
          <code className="min-w-0 flex-1 truncate rounded-lg border border-border bg-bg px-3 py-2 text-xs text-subtle">
            cardwiz.in/?ref={user.referralCode ?? "…"}
          </code>
          <button
            onClick={copyRefLink}
            className="shrink-0 rounded-lg bg-pink px-3.5 py-2 text-xs font-bold text-white transition-opacity hover:opacity-90"
          >
            {t("rw_ref_copy")}
          </button>
        </div>
      </div>

      {/* Leaderboard */}
      <div>
        <h2 className="text-lg font-black">{t("rw_lb_h")}</h2>
        <p className="mb-3 text-xs text-muted">{t("rw_lb_sub")}</p>
        {!lb || lb.top.length === 0 ? (
          <p className="rounded-xl border border-dashed border-border py-6 text-center text-sm text-muted">{t("rw_lb_empty")}</p>
        ) : (
          <>
            <div className="divide-y divide-border overflow-hidden rounded-2xl border border-border bg-surface2">
              {lb.top.map((row, i) => {
                const isMe = row.id === lb.me.id;
                return (
                  <div key={row.id} className={`flex items-center gap-3 px-4 py-2.5 ${isMe ? "bg-accent/10" : ""}`}>
                    <span className={`w-6 shrink-0 text-center text-sm font-black tabular-nums ${i < 3 ? "text-accent" : "text-muted"}`}>
                      {i === 0 ? "🥇" : i === 1 ? "🥈" : i === 2 ? "🥉" : i + 1}
                    </span>
                    <span className="flex h-7 w-7 shrink-0 items-center justify-center overflow-hidden rounded-full bg-accent/20 text-xs font-bold text-accent">
                      {row.picture ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={row.picture} alt="" width={28} height={28} referrerPolicy="no-referrer" className="h-7 w-7 rounded-full" />
                      ) : (
                        (row.name || "?").charAt(0).toUpperCase()
                      )}
                    </span>
                    <span className="min-w-0 flex-1 truncate text-sm font-semibold">
                      {row.name}
                      {isMe && <span className="ml-1.5 rounded-full bg-accent px-1.5 py-0.5 text-[10px] font-bold text-onaccent">{t("rw_lb_you")}</span>}
                    </span>
                    <span className="shrink-0 text-sm font-black tabular-nums text-accent">{row.earned.toLocaleString("en-IN")}</span>
                  </div>
                );
              })}
            </div>
            {!lb.top.some((r) => r.id === lb.me.id) && lb.me.earned > 0 && (
              <p className="mt-2 text-center text-xs font-semibold text-subtle">{t("rw_lb_rank", { n: lb.me.rank })}</p>
            )}
          </>
        )}
      </div>

      {/* How to earn */}
      <div>
        <h2 className="mb-3 text-lg font-black">{t("rw_earn_h")}</h2>
        <div className="space-y-2.5">
          {EARN.map((e) => (
            <Link
              key={e.reason}
              href={e.href}
              className="flex items-center gap-3 rounded-xl border border-border bg-surface2 p-4 transition-colors hover:border-accent"
            >
              <span className="text-2xl">{e.icon}</span>
              <span className="flex-1 text-sm font-semibold">{t(e.key)}</span>
              <span className="shrink-0 rounded-full bg-green/15 px-2.5 py-0.5 text-xs font-bold tabular-nums text-green">
                {t("rw_pts", { n: data?.earnRates?.[e.reason] ?? 0 })}
              </span>
            </Link>
          ))}
        </div>
        <p className="mt-2 text-xs text-muted">{t("rw_earn_more")}</p>
      </div>

      {/* Recent activity */}
      <div>
        <h2 className="mb-3 text-lg font-black">{t("rw_activity_h")}</h2>
        {loading ? (
          <div className="animate-pulse py-8 text-center text-sm text-muted">…</div>
        ) : !data || data.history.length === 0 ? (
          <p className="rounded-xl border border-dashed border-border py-6 text-center text-sm text-muted">
            {t("rw_empty")}
          </p>
        ) : (
          <div className="divide-y divide-border overflow-hidden rounded-2xl border border-border bg-surface2">
            {data.history.map((h, i) => (
              <div key={i} className="flex items-center justify-between gap-3 px-4 py-3">
                <div className="min-w-0">
                  <div className="text-sm font-semibold">{t(`rw_reason_${h.reason}`)}</div>
                  <div className="text-xs text-muted">{fmtDate(h.createdAt)}</div>
                </div>
                <div className={`shrink-0 text-sm font-black tabular-nums ${h.delta >= 0 ? "text-green" : "text-pink"}`}>
                  {h.delta >= 0 ? "+" : ""}
                  {h.delta}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
