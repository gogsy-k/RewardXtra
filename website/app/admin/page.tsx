"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import AdminGate from "@/components/AdminGate";
import AdminsManager from "@/components/admin/AdminsManager";
import { adminListPosts, schedulePosts } from "@/lib/admin-api";
import { adminGetOffers, adminUpdateOffer, type Offer } from "@/lib/offers-api";
import { authedFetch } from "@/lib/auth";
import { formatDate, type Post } from "@/lib/posts";

type Tab = "news" | "offers";

export default function AdminPage() {
  return (
    <div className="mx-auto max-w-4xl px-5 py-10">
      <AdminGate>
        <Dashboard />
      </AdminGate>
    </div>
  );
}

function Dashboard() {
  const [tab, setTab] = useState<Tab>("news");

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-black">Admin</h1>

      {/* Tab switcher */}
      <div className="flex gap-2">
        {(["news", "offers"] as Tab[]).map((t) => (
          <button key={t} onClick={() => setTab(t)}
            className={`rounded-lg px-4 py-2 text-sm font-bold capitalize transition-colors ${
              tab === t ? "bg-accent text-onaccent" : "border border-border hover:border-accent"
            }`}>
            {t === "news" ? "News" : "Offers Moderation"}
          </button>
        ))}
      </div>

      {tab === "news" ? <NewsTab /> : <OffersTab />}

      <EmailTestCard />

      <AdminsManager />
    </div>
  );
}

function EmailTestCard() {
  const [state, setState] = useState<"idle" | "sending" | "ok" | "err">("idle");
  const [msg, setMsg] = useState("");

  async function send() {
    setState("sending");
    setMsg("");
    try {
      const res = await authedFetch("/account/test-report", { method: "POST" });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setState("err");
        setMsg(data.message || data.error || "Failed");
        return;
      }
      setState("ok");
      setMsg(
        `Sent to ${data.sentTo}${data.usedSampleData ? " (sample data — no txns last month)" : " (your real last-month data)"}. Inbox check karo.`,
      );
    } catch (e) {
      setState("err");
      setMsg(e instanceof Error ? e.message : "Network error");
    }
  }

  return (
    <div className="rounded-2xl border border-border bg-surface2 p-5">
      <h2 className="text-lg font-extrabold">📧 Email Test</h2>
      <p className="mt-1 text-sm text-muted">
        Apne aap ko ek sample monthly report bhej ke Resend pipeline confirm karo.
      </p>
      <button
        onClick={send}
        disabled={state === "sending"}
        className="mt-4 rounded-xl bg-accent px-4 py-2 text-sm font-bold text-onaccent transition-colors hover:bg-blue disabled:opacity-50"
      >
        {state === "sending" ? "Sending…" : "Send me a test report"}
      </button>
      {msg && (
        <p className={`mt-3 text-sm ${state === "ok" ? "text-green" : "text-pink"}`}>{msg}</p>
      )}
    </div>
  );
}

function NewsTab() {
  const [posts, setPosts] = useState<Post[] | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [showSched, setShowSched] = useState(false);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [startAt, setStartAt] = useState("");
  const [gapHours, setGapHours] = useState(24);
  const [scheduling, setScheduling] = useState(false);
  const [schedMsg, setSchedMsg] = useState("");

  function reload() {
    return adminListPosts()
      .then(setPosts)
      .catch((e) => setErr(e instanceof Error ? e.message : "Failed to load"));
  }
  useEffect(() => { reload(); }, []);

  const drafts = (posts ?? []).filter((p) => p.status === "draft");

  function toggle(id: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  }

  async function runSchedule() {
    setSchedMsg("");
    if (selected.size === 0) return setSchedMsg("Select at least one draft below.");
    if (!startAt) return setSchedMsg("Pick a start date & time.");
    setScheduling(true);
    try {
      const ids = drafts.filter((d) => selected.has(d.id)).map((d) => d.id); // top-to-bottom order
      const r = await schedulePosts(ids, new Date(startAt).toISOString(), gapHours);
      setSchedMsg(`✅ Scheduled ${r.scheduled} — one every ${gapHours}h from ${new Date(startAt).toLocaleString("en-IN")}.`);
      setSelected(new Set());
      await reload();
    } catch (e) {
      setSchedMsg(e instanceof Error ? e.message : "Schedule failed");
    } finally {
      setScheduling(false);
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-2">
        <h2 className="text-lg font-extrabold">News Posts</h2>
        <div className="flex gap-2">
          <button
            onClick={() => setShowSched((v) => !v)}
            className="rounded-xl border border-border px-4 py-2 text-sm font-bold text-accent transition-colors hover:border-accent"
          >
            ⏰ Schedule drafts
          </button>
          <Link href="/admin/new"
            className="rounded-xl bg-accent px-4 py-2 text-sm font-bold text-onaccent transition-colors hover:bg-blue">
            + New post
          </Link>
        </div>
      </div>

      {/* Bulk scheduler — drip drafts out automatically (no cron; they auto-go-live) */}
      {showSched && (
        <div className="space-y-3 rounded-2xl border border-accent/40 bg-surface2 p-4">
          <div className="text-sm font-bold">⏰ Bulk schedule — drip your drafts out</div>
          <p className="text-xs text-muted">
            Write many posts as <b>drafts</b>, then select them here, pick a start time + gap, and they publish
            one-by-one (top-to-bottom) automatically. Gap 24h = one per day.
          </p>
          <div className="flex flex-wrap items-end gap-3">
            <div>
              <label className="mb-1 block text-[11px] font-semibold text-subtle">Start at</label>
              <input type="datetime-local" value={startAt} onChange={(e) => setStartAt(e.target.value)}
                className="rounded-lg border border-border bg-surface px-3 py-2 text-sm text-fg" />
            </div>
            <div>
              <label className="mb-1 block text-[11px] font-semibold text-subtle">Gap (hours)</label>
              <input type="number" min={1} value={gapHours}
                onChange={(e) => setGapHours(Math.max(1, Number(e.target.value) || 24))}
                className="w-24 rounded-lg border border-border bg-surface px-3 py-2 text-sm text-fg" />
            </div>
            <button onClick={runSchedule} disabled={scheduling}
              className="rounded-xl bg-accent px-5 py-2 text-sm font-bold text-onaccent transition-colors hover:bg-blue disabled:opacity-50">
              {scheduling ? "Scheduling…" : `Schedule ${selected.size} draft${selected.size === 1 ? "" : "s"}`}
            </button>
          </div>
          {schedMsg && <p className="text-xs text-subtle">{schedMsg}</p>}

          <div className="max-h-64 overflow-y-auto rounded-xl border border-border">
            {drafts.length === 0 ? (
              <p className="p-3 text-xs text-muted">No drafts to schedule — create posts with “Save draft” first.</p>
            ) : (
              drafts.map((d) => (
                <label key={d.id}
                  className="flex cursor-pointer items-center gap-2 border-b border-border px-3 py-2 text-sm last:border-0 hover:bg-surface">
                  <input type="checkbox" checked={selected.has(d.id)} onChange={() => toggle(d.id)} />
                  <span className="truncate">{d.title || "(untitled)"}</span>
                  <span className="ml-auto shrink-0 text-[10px] uppercase text-muted">{d.lang}</span>
                </label>
              ))
            )}
          </div>
        </div>
      )}

      <div className="rounded-2xl border border-border bg-surface2 p-2">
        {err && <p className="p-4 text-sm text-pink">{err}</p>}
        {!posts && !err && <p className="p-4 text-sm text-muted">Loading…</p>}
        {posts && posts.length === 0 && <p className="p-4 text-sm text-muted">No posts yet. Create one →</p>}
        {posts?.map((p) => (
          <Link key={p.id} href={`/admin/edit/${p.id}`}
            className="flex items-center justify-between gap-3 rounded-xl px-4 py-3 transition-colors hover:bg-surface">
            <div className="min-w-0">
              <div className="truncate font-semibold">{p.title || "(untitled)"}</div>
              <div className="text-xs text-muted">
                {formatDate(p.publishedAt || p.updatedAt)}
                {p.category && <> · {p.category}</>}
              </div>
            </div>
            {(() => {
              const sched = p.status === "published" && !!p.publishedAt && new Date(p.publishedAt) > new Date();
              return (
                <span className={`shrink-0 rounded-full px-2.5 py-0.5 text-[10px] font-bold ${
                  sched ? "bg-yellow/20 text-yellow"
                    : p.status === "published" ? "bg-green/20 text-green"
                    : "border border-border text-muted"
                }`}>
                  {sched ? "⏰ SCHEDULED" : p.status === "published" ? "PUBLISHED" : "DRAFT"}
                </span>
              );
            })()}
          </Link>
        ))}
      </div>
    </div>
  );
}

function OffersTab() {
  const [filter, setFilter] = useState<"pending" | "approved" | "rejected">("pending");
  const [offers, setOffers] = useState<Offer[] | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);

  function load() {
    setOffers(null);
    setErr(null);
    adminGetOffers(filter)
      .then(setOffers)
      .catch((e) => setErr(e instanceof Error ? e.message : "Failed to load"));
  }

  useEffect(() => { load(); }, [filter]); // eslint-disable-line react-hooks/exhaustive-deps

  async function act(id: string, status: "approved" | "rejected") {
    setBusy(id);
    try {
      await adminUpdateOffer(id, status);
      setOffers((prev) => prev?.filter((o) => o.id !== id) ?? []);
    } catch {
      setErr("Action failed");
    } finally {
      setBusy(null);
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-extrabold">User Submitted Offers</h2>
        <div className="flex gap-1">
          {(["pending", "approved", "rejected"] as const).map((s) => (
            <button key={s} onClick={() => setFilter(s)}
              className={`rounded-lg px-3 py-1.5 text-xs font-bold capitalize transition-colors ${
                filter === s ? "bg-accent text-onaccent" : "border border-border hover:border-accent"
              }`}>
              {s}
            </button>
          ))}
        </div>
      </div>

      {err && <p className="text-sm text-pink">{err}</p>}
      {!offers && !err && <p className="text-sm text-muted animate-pulse">Loading…</p>}
      {offers?.length === 0 && <p className="text-sm text-muted py-6 text-center">No {filter} offers.</p>}

      <div className="space-y-3">
        {offers?.map((o) => (
          <div key={o.id} className="rounded-xl border border-border bg-surface2 p-4">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <div className="font-semibold text-sm">{o.title}</div>
                <div className="text-xs text-accent font-semibold mt-0.5">{o.discountText}</div>
                <div className="flex flex-wrap gap-x-3 mt-1.5 text-xs text-muted">
                  <span>🏪 {o.merchant}</span>
                  {o.bank && <span>🏦 {o.bank}</span>}
                  {o.validUntil && <span>📅 Till {o.validUntil}</span>}
                  {o.submittedByEmail && <span>👤 {o.submittedByEmail}</span>}
                </div>
              </div>
              {filter === "pending" && (
                <div className="flex gap-2 shrink-0">
                  <button onClick={() => act(o.id, "approved")} disabled={busy === o.id}
                    className="rounded-lg bg-green/15 text-green px-3 py-1.5 text-xs font-bold hover:bg-green/30 disabled:opacity-50">
                    ✓ Approve
                  </button>
                  <button onClick={() => act(o.id, "rejected")} disabled={busy === o.id}
                    className="rounded-lg bg-pink/10 text-pink px-3 py-1.5 text-xs font-bold hover:bg-pink/20 disabled:opacity-50">
                    ✗ Reject
                  </button>
                </div>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
