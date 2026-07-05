"use client";

import { useEffect, useState } from "react";
import { listAdmins, addAdmin, removeAdmin, type AdminListResponse } from "@/lib/admin-api";

/* Super-admin only. Non-super-admins get 403 on listAdmins → component hides itself. */
export default function AdminsManager() {
  const [data, setData] = useState<AdminListResponse | null>(null);
  const [hidden, setHidden] = useState(false);
  const [email, setEmail] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  async function load() {
    try {
      setData(await listAdmins());
    } catch {
      setHidden(true); // 403 (not super-admin) or error → don't show the panel
    }
  }

  useEffect(() => {
    load();
  }, []);

  if (hidden) return null;

  async function add() {
    const e = email.trim();
    if (!e) return;
    setBusy(true);
    setErr(null);
    try {
      await addAdmin(e);
      setEmail("");
      await load();
    } catch (ex) {
      setErr(ex instanceof Error ? ex.message : "Failed to add");
    } finally {
      setBusy(false);
    }
  }

  async function remove(target: string) {
    setBusy(true);
    setErr(null);
    try {
      await removeAdmin(target);
      await load();
    } catch (ex) {
      setErr(ex instanceof Error ? ex.message : "Failed to remove");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="rounded-2xl border border-border bg-surface2 p-5">
      <h2 className="font-extrabold">Admins</h2>
      <p className="mt-1 text-xs text-muted">
        Admins can create &amp; manage news. Super-admins (below) are fixed and can&apos;t be removed.
      </p>

      <div className="mt-4 space-y-1.5">
        {data?.superAdmins.map((e) => (
          <div key={e} className="flex items-center justify-between rounded-lg bg-surface px-3 py-2 text-sm">
            <span>{e}</span>
            <span className="rounded-full bg-accent px-2 py-0.5 text-[10px] font-bold text-onaccent">SUPER</span>
          </div>
        ))}
        {data?.admins.map((a) => (
          <div key={a.email} className="flex items-center justify-between rounded-lg bg-surface px-3 py-2 text-sm">
            <span>{a.email}</span>
            <button
              onClick={() => remove(a.email)}
              disabled={busy}
              className="text-xs font-semibold text-pink hover:underline disabled:opacity-50"
            >
              Remove
            </button>
          </div>
        ))}
        {data && data.admins.length === 0 && (
          <p className="px-1 py-2 text-xs text-muted">No additional admins yet.</p>
        )}
      </div>

      <div className="mt-4 flex gap-2">
        <input
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="new-admin@gmail.com"
          className="flex-1 rounded-xl border border-border bg-surface px-3.5 py-2 text-sm outline-none focus:border-accent"
        />
        <button
          onClick={add}
          disabled={busy}
          className="rounded-xl bg-accent px-4 py-2 text-sm font-bold text-onaccent transition-colors hover:bg-blue disabled:opacity-50"
        >
          Add
        </button>
      </div>
      {err && <p className="mt-2 text-xs text-pink">{err}</p>}
    </div>
  );
}
