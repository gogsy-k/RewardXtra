"use client";

import { useState, useRef, useCallback } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useAuth } from "@/contexts/AuthContext";
import { useLang } from "@/contexts/LangContext";
import { authedFetch, isPaid } from "@/lib/auth";
import { uploadStatement, bulkImport, type ParsedTransaction } from "@/lib/upload-api";
import { CATEGORY_LABEL } from "@/lib/cards";

const CATEGORIES = Object.entries(CATEGORY_LABEL).sort((a, b) => a[1].localeCompare(b[1]));

type WalletEntry = { id: string; cardId: string; nickname?: string; last4?: string };

// Editable row state
type RowState = ParsedTransaction & { selected: boolean; idx: number };

function fmtINR(n: number) {
  return "₹" + n.toLocaleString("en-IN", { maximumFractionDigits: 2 });
}

// ── Drop zone ─────────────────────────────────────────────────────────────────
function DropZone({ onFile }: { onFile: (f: File) => void }) {
  const { t } = useLang();
  const [dragging, setDragging] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  function handle(f: File | null) {
    if (f && f.name.endsWith(".pdf")) onFile(f);
  }

  return (
    <div
      onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
      onDragLeave={() => setDragging(false)}
      onDrop={(e) => { e.preventDefault(); setDragging(false); handle(e.dataTransfer.files[0]); }}
      onClick={() => inputRef.current?.click()}
      className={`cursor-pointer rounded-2xl border-2 border-dashed p-10 text-center transition-colors ${
        dragging ? "border-accent bg-accent/5" : "border-border hover:border-accent/60"
      }`}
    >
      <div className="text-4xl mb-3">📄</div>
      <div className="font-bold mb-1">{t("up_drop")}</div>
      <p className="text-sm text-muted mb-4">{t("up_drop_sub")}</p>
      <span className="inline-block rounded-lg border border-border px-4 py-2 text-sm font-bold hover:border-accent">
        {t("up_choose")}
      </span>
      <input
        ref={inputRef}
        type="file"
        accept=".pdf,application/pdf"
        className="hidden"
        onChange={(e) => handle(e.target.files?.[0] ?? null)}
      />
      <p className="mt-4 text-xs text-muted">{t("up_privacy")}</p>
    </div>
  );
}

// ── Review table ──────────────────────────────────────────────────────────────
function ReviewTable({
  rows,
  onChange,
}: {
  rows: RowState[];
  onChange: (idx: number, patch: Partial<RowState>) => void;
}) {
  const { t } = useLang();
  const allSelected = rows.every((r) => r.selected);

  return (
    <div className="rounded-2xl border border-border bg-surface2 overflow-hidden">
      <div className="flex items-center gap-3 px-4 py-3 border-b border-border">
        <input
          type="checkbox"
          checked={allSelected}
          onChange={(e) => rows.forEach((r) => onChange(r.idx, { selected: e.target.checked }))}
          className="h-4 w-4 accent-accent"
        />
        <span className="text-xs font-bold text-muted uppercase tracking-wide">
          {t("up_selected", { sel: rows.filter((r) => r.selected).length, total: rows.length })}
        </span>
      </div>

      <div className="divide-y divide-border max-h-[480px] overflow-y-auto">
        {rows.map((row) => (
          <div key={row.idx} className={`flex items-center gap-3 px-4 py-3 ${!row.selected ? "opacity-40" : ""}`}>
            <input
              type="checkbox"
              checked={row.selected}
              onChange={(e) => onChange(row.idx, { selected: e.target.checked })}
              className="h-4 w-4 accent-accent shrink-0"
            />

            <div className="shrink-0 w-[76px] text-xs text-muted">{row.date}</div>

            <div className="flex-1 min-w-0">
              <div className="text-sm font-semibold truncate">{row.merchant}</div>
            </div>

            <div className="shrink-0 text-sm font-black text-green w-[72px] text-right">
              {fmtINR(row.amount)}
            </div>

            <select
              value={row.category ?? ""}
              onChange={(e) => onChange(row.idx, { category: e.target.value || null })}
              className={`shrink-0 w-[140px] rounded-lg border bg-bg px-2 py-1 text-xs focus:outline-none focus:ring-1 focus:ring-accent ${
                !row.category ? "border-yellow-500 text-yellow-400" : "border-border"
              }`}
            >
              <option value="">{t("up_set_cat")}</option>
              {CATEGORIES.map(([id, label]) => (
                <option key={id} value={id}>{label}</option>
              ))}
            </select>
          </div>
        ))}
      </div>
    </div>
  );
}

// ── Main page ─────────────────────────────────────────────────────────────────
export default function UploadPage() {
  const { user } = useAuth();
  const { t } = useLang();
  const router = useRouter();
  const isPremium = isPaid(user?.plan);

  const [stage, setStage] = useState<"pick" | "parsing" | "review" | "done">("pick");
  const [submitting, setSubmitting] = useState(false);
  const [rows, setRows] = useState<RowState[]>([]);
  const [warnings, setWarnings] = useState<string[]>([]);
  const [wallet, setWallet] = useState<WalletEntry[]>([]);
  const [cardId, setCardId] = useState("");
  const [error, setError] = useState("");
  const [importedCount, setImportedCount] = useState(0);

  const loadWallet = useCallback(async () => {
    try {
      const res = await authedFetch("/cards");
      if (res.ok) setWallet(await res.json());
    } catch { /* ignore */ }
  }, []);

  async function handleFile(file: File) {
    setError("");
    setStage("parsing");
    await loadWallet();
    try {
      const { parsed, warnings: w } = await uploadStatement(file);
      setWarnings(w);
      setRows(
        parsed.map((t, i) => ({ ...t, selected: true, idx: i }))
      );
      setStage("review");
    } catch (err) {
      if (err instanceof Error && err.message === "premium_required") {
        setStage("pick");
        setError("premium_required");
      } else {
        setError(err instanceof Error ? err.message : "Parse failed.");
        setStage("pick");
      }
    }
  }

  function patchRow(idx: number, patch: Partial<RowState>) {
    setRows((prev) => prev.map((r) => (r.idx === idx ? { ...r, ...patch } : r)));
  }

  async function handleImport() {
    const selected = rows.filter((r) => r.selected && r.category);
    if (!selected.length) { setError(t("up_err_none")); return; }
    setSubmitting(true);
    setError("");
    try {
      const { created } = await bulkImport({
        transactions: selected.map((r) => ({
          date: r.date, merchant: r.merchant, amount: r.amount,
          category: r.category!, source: "pdf",
        })),
        cardId: cardId || undefined,
      });
      setImportedCount(created);
      setStage("done");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Import failed.");
    } finally {
      setSubmitting(false);
    }
  }

  if (!user) return null;

  // Premium gate
  if (!isPremium && error !== "premium_required") {
    return (
      <div className="mx-auto max-w-3xl px-5 py-10 space-y-6">
        <div>
          <Link href="/account" className="text-xs text-muted hover:text-subtle">← Account</Link>
          <h1 className="mt-1 text-2xl font-black">{t("acc_feat_upload_t")}</h1>
        </div>
        <div className="rounded-2xl border border-accent/30 bg-accent/5 p-8 text-center">
          <div className="text-4xl mb-3">💎</div>
          <div className="text-lg font-black mb-2">{t("up_premium_h")}</div>
          <p className="text-sm text-muted mb-5 max-w-sm mx-auto leading-relaxed">
            {t("up_premium_p")}
          </p>
          <Link href="/pricing" className="inline-block rounded-xl bg-accent px-6 py-2.5 text-sm font-bold text-onaccent">
            {t("sav_gate_cta")}
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-3xl px-5 py-10 space-y-6">

      {/* Header */}
      <div>
        <Link href="/account/transactions" className="text-xs text-muted hover:text-subtle">
          ← My Transactions
        </Link>
        <h1 className="mt-1 text-2xl font-black">{t("acc_feat_upload_t")}</h1>
        <p className="text-sm text-muted mt-0.5">{t("up_sub")}</p>
      </div>

      {/* Done */}
      {stage === "done" && (
        <div className="rounded-2xl border border-green-400/30 bg-green-400/5 p-8 text-center">
          <div className="text-4xl mb-3">✅</div>
          <div className="text-lg font-bold mb-1">{t("up_done", { n: importedCount })}</div>
          <p className="text-sm text-muted mb-5">{t("up_done_p")}</p>
          <div className="flex flex-wrap justify-center gap-3">
            <Link href="/account/transactions" className="rounded-xl bg-accent px-5 py-2.5 text-sm font-bold text-onaccent">
              {t("up_view_txns")}
            </Link>
            <Link href="/account/savings" className="rounded-xl border border-border px-5 py-2.5 text-sm font-bold hover:border-accent">
              {t("up_view_savings")}
            </Link>
          </div>
          <button
            onClick={() => { setStage("pick"); setRows([]); setWarnings([]); setError(""); }}
            className="mt-4 text-xs text-muted hover:underline"
          >
            {t("up_again")}
          </button>
        </div>
      )}

      {/* Parsing spinner */}
      {stage === "parsing" && (
        <div className="rounded-2xl border border-border bg-surface2 p-10 text-center">
          <div className="inline-block h-10 w-10 animate-spin rounded-full border-4 border-border border-t-accent mb-4" />
          <div className="font-bold">{t("up_parsing")}</div>
          <p className="text-sm text-muted mt-1">{t("up_parsing_sub")}</p>
        </div>
      )}

      {/* File pick */}
      {(stage === "pick" || stage === "parsing") && stage !== "parsing" && (
        <DropZone onFile={handleFile} />
      )}

      {/* Error */}
      {error && error !== "premium_required" && (
        <div className="rounded-xl border border-red-400/30 bg-red-400/5 p-4 text-sm text-red-400">
          {error}
        </div>
      )}

      {/* Warnings */}
      {stage === "review" && warnings.length > 0 && (
        <div className="space-y-2">
          {warnings.map((w, i) => (
            <div key={i} className="rounded-xl border border-yellow-500/30 bg-yellow-500/5 px-4 py-2.5 text-sm text-yellow-400">
              ⚠️ {w}
            </div>
          ))}
        </div>
      )}

      {/* Review */}
      {stage === "review" && rows.length > 0 && (
        <>
          {/* Card selector */}
          <div className="rounded-xl border border-border bg-surface2 p-4 flex flex-wrap items-center gap-3">
            <label className="text-sm font-bold shrink-0">{t("up_card_label")}</label>
            <select
              value={cardId}
              onChange={(e) => setCardId(e.target.value)}
              className="rounded-lg border border-border bg-bg px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-accent"
            >
              <option value="">{t("up_select_card")}</option>
              {wallet.map((w) => (
                <option key={w.id} value={w.cardId}>
                  {w.nickname || w.cardId}{w.last4 ? ` (••${w.last4})` : ""}
                </option>
              ))}
            </select>
            <p className="text-xs text-muted">{t("up_card_hint")}</p>
          </div>

          <ReviewTable rows={rows} onChange={patchRow} />

          <div className="flex flex-wrap items-center gap-3">
            <button
              onClick={handleImport}
              disabled={submitting}
              className="rounded-xl bg-accent px-6 py-2.5 text-sm font-bold text-onaccent disabled:opacity-50"
            >
              {submitting
                ? t("up_importing")
                : t("up_import", { n: rows.filter((r) => r.selected).length })}
            </button>
            <button
              onClick={() => { setStage("pick"); setRows([]); setWarnings([]); setError(""); }}
              className="text-sm text-muted hover:text-text"
            >
              {t("up_startover")}
            </button>
            <p className="text-xs text-muted">{t("up_import_hint")}</p>
          </div>
        </>
      )}

      {stage === "review" && rows.length === 0 && (
        <div className="rounded-2xl border border-dashed border-border p-10 text-center">
          <div className="text-4xl mb-3">🔍</div>
          <div className="font-bold">{t("up_none_h")}</div>
          <p className="text-sm text-muted mt-1 mb-4">{t("up_none_p")}</p>
          <div className="flex flex-wrap justify-center gap-3">
            <button
              onClick={() => { setStage("pick"); setRows([]); }}
              className="rounded-xl border border-border px-5 py-2.5 text-sm font-bold"
            >
              {t("up_try_another")}
            </button>
            <Link href="/account/transactions" className="rounded-xl bg-accent px-5 py-2.5 text-sm font-bold text-onaccent">
              {t("up_add_manual")}
            </Link>
          </div>
        </div>
      )}

    </div>
  );
}
