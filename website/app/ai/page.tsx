"use client";

import { useState, useRef, useEffect } from "react";
import Link from "next/link";
import { track } from "@vercel/analytics";
import { sendChatMessage, type TopCard } from "@/lib/ai-api";
import { useAuth } from "@/contexts/AuthContext";
import { useLang } from "@/contexts/LangContext";
import { isPaid } from "@/lib/auth";
import Reveal from "@/components/motion/Reveal";

const SUGGESTION_KEYS = ["ai_ex_1", "ai_ex_2", "ai_ex_3", "ai_ex_4", "ai_ex_5"];

type Msg = {
  role: "user" | "assistant";
  text: string;
  topCards?: TopCard[];
  error?: boolean;
};

function CardChip({ card }: { card: TopCard }) {
  return (
    <Link
      href={`/cards/${card.id}`}
      className="inline-flex items-center gap-1.5 rounded-full border border-accent/30 bg-accent/5 px-3 py-1 text-xs font-semibold text-accent hover:bg-accent/15 transition-colors"
    >
      💳 {card.name}
    </Link>
  );
}

function Bubble({ msg }: { msg: Msg }) {
  const isUser = msg.role === "user";
  return (
    <div className={`flex ${isUser ? "justify-end" : "justify-start"} gap-3`}>
      {!isUser && (
        <div className="shrink-0 mt-1 h-8 w-8 rounded-full bg-accent/20 flex items-center justify-center text-sm">
          🤖
        </div>
      )}
      <div className={`max-w-[82%] space-y-2 flex flex-col ${isUser ? "items-end" : "items-start"}`}>
        <div
          className={`rounded-2xl px-4 py-2.5 text-sm leading-relaxed whitespace-pre-wrap ${
            isUser
              ? "bg-accent text-onaccent rounded-br-sm"
              : msg.error
              ? "bg-red-400/10 text-red-400 border border-red-400/20 rounded-bl-sm"
              : "bg-surface2 border border-border rounded-bl-sm"
          }`}
        >
          {msg.text}
        </div>
        {!isUser && msg.topCards && msg.topCards.length > 0 && (
          <div className="flex flex-wrap gap-1.5 pl-1">
            {msg.topCards.slice(0, 3).map((c) => (
              <CardChip key={c.id} card={c} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

export default function AiPage() {
  const { user } = useAuth();
  const { t } = useLang();
  const isPremium = isPaid(user?.plan);

  const [messages, setMessages] = useState<Msg[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [slowHint, setSlowHint] = useState(false);
  const [lastQuery, setLastQuery] = useState("");
  const [remaining, setRemaining] = useState<number | null>(null);
  const [rateLimited, setRateLimited] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, loading]);

  async function send(query: string) {
    const q = query.trim();
    if (!q || loading) return;
    setInput("");
    setRateLimited(false);
    setLastQuery(q);
    setMessages((prev) => [...prev, { role: "user", text: q }]);
    setLoading(true);
    track("ai_query");
    // Render free instance cold-starts (~50s on first hit) — reassure after 3s.
    const slowTimer = setTimeout(() => setSlowHint(true), 3000);
    try {
      const res = await sendChatMessage(q);
      setRemaining(res.remaining);
      setMessages((prev) => [...prev, { role: "assistant", text: res.reply, topCards: res.topCards }]);
    } catch (err) {
      if (err instanceof Error && err.message === "rate_limit") {
        setRateLimited(true);
        const hours = (err as Error & { resetInHours?: number }).resetInHours;
        setMessages((prev) => [
          ...prev,
          {
            role: "assistant",
            text: `Daily limit khatam ho gaya. ${hours ? `${hours}h baad` : "Kal"} dobara try karo.`,
            error: true,
          },
        ]);
      } else {
        setMessages((prev) => [
          ...prev,
          { role: "assistant", text: t("ai_err"), error: true },
        ]);
      }
    } finally {
      clearTimeout(slowTimer);
      setSlowHint(false);
      setLoading(false);
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); send(input); }
  }

  const dailyMax = isPremium ? "∞" : user ? "5" : "3";

  return (
    <div className="mx-auto max-w-2xl px-4 py-8 space-y-6">

      {/* Page header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-black flex items-center gap-2">
            🤖 CardWiz AI
            <span className="text-xs font-bold rounded-full bg-accent/15 text-accent px-2 py-0.5">Beta</span>
          </h1>
          <p className="text-sm text-subtle mt-0.5">{t("ai_sub")}</p>
        </div>
        {!isPremium && remaining !== null && (
          <div className="text-xs text-muted text-right">
            <div className="font-bold">{remaining}/{dailyMax}</div>
            <div>{t("ai_queries_today")}</div>
          </div>
        )}
      </div>

      {/* Suggestions (only before first message) */}
      {messages.length === 0 && (
        <div className="space-y-2">
          <div className="text-xs text-muted font-bold uppercase tracking-wide">{t("ai_try")}</div>
          {SUGGESTION_KEYS.map((key, i) => {
            const prompt = t(key);
            return (
              <Reveal key={key} delay={i * 0.06}>
                <button
                  onClick={() => send(prompt)}
                  disabled={loading}
                  className="w-full text-left rounded-xl border border-border bg-surface2 px-4 py-3 text-sm hover:border-accent transition-colors disabled:opacity-50"
                >
                  {prompt}
                </button>
              </Reveal>
            );
          })}
          {!user && (
            <div className="rounded-xl border border-accent/30 bg-accent/5 p-4 text-center text-sm mt-4">
              <div className="font-bold mb-1">{t("ai_signin_h")}</div>
              <p className="text-xs text-subtle mb-3">{t("ai_signin_p")}</p>
              <Link href="/sign-in" className="inline-block rounded-lg bg-accent px-4 py-2 text-xs font-bold text-onaccent">
                {t("ai_signin_btn")}
              </Link>
            </div>
          )}
        </div>
      )}

      {/* Chat messages */}
      {messages.length > 0 && (
        <div className="space-y-4 rounded-2xl border border-border bg-surface2 p-4">
          {messages.map((msg, i) => <Bubble key={i} msg={msg} />)}
          {loading && (
            <div className="flex gap-3">
              <div className="h-8 w-8 rounded-full bg-accent/20 flex items-center justify-center text-sm shrink-0">🤖</div>
              <div className="rounded-2xl rounded-bl-sm border border-border bg-bg px-4 py-3">
                <div className="flex gap-1.5">
                  <span className="h-2 w-2 rounded-full bg-accent animate-bounce" style={{ animationDelay: "0ms" }} />
                  <span className="h-2 w-2 rounded-full bg-accent animate-bounce" style={{ animationDelay: "150ms" }} />
                  <span className="h-2 w-2 rounded-full bg-accent animate-bounce" style={{ animationDelay: "300ms" }} />
                </div>
                {slowHint && (
                  <p className="mt-2 text-xs text-subtle">{t("ai_slow")}</p>
                )}
              </div>
            </div>
          )}
          {/* Retry the last query after an error (not on rate-limit) */}
          {!loading && !rateLimited && lastQuery && messages[messages.length - 1]?.error && (
            <div className="flex justify-center">
              <button
                onClick={() => send(lastQuery)}
                className="rounded-lg border border-border px-4 py-1.5 text-xs font-bold text-accent transition-colors hover:border-accent"
              >
                {t("ai_retry")}
              </button>
            </div>
          )}
          <div ref={bottomRef} />
        </div>
      )}

      {/* Rate limit upsell */}
      {rateLimited && !isPremium && (
        <div className="rounded-xl border border-accent/30 bg-accent/5 p-4 text-center">
          <div className="font-bold mb-1">{t("ai_rl_h")}</div>
          <p className="text-xs text-subtle mb-3">{t("ai_rl_p")}</p>
          <Link href="/pricing" className="inline-block rounded-lg bg-accent px-5 py-2 text-xs font-bold text-onaccent">
            {t("sav_gate_cta")}
          </Link>
        </div>
      )}

      {/* Input box */}
      <div className="sticky bottom-4">
        <div className="flex gap-2 items-end rounded-2xl border border-border bg-surface shadow-lg px-3 py-2">
          <textarea
            ref={inputRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={t("ai_input_ph")}
            rows={1}
            disabled={loading || rateLimited}
            autoFocus
            className="flex-1 resize-none bg-transparent text-sm focus:outline-none placeholder:text-muted disabled:opacity-50 max-h-28 overflow-y-auto py-1"
            style={{ minHeight: "28px" }}
          />
          <button
            onClick={() => send(input)}
            disabled={loading || !input.trim() || rateLimited}
            className="shrink-0 h-9 w-9 rounded-xl bg-accent flex items-center justify-center disabled:opacity-40 transition-opacity"
          >
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="text-onaccent rotate-90">
              <line x1="12" y1="19" x2="12" y2="5" /><polyline points="5 12 12 5 19 12" />
            </svg>
          </button>
        </div>
        <p className="text-center text-xs text-subtle mt-1.5">
          {t("ai_disclaimer")}
        </p>
        <p className="text-center text-xs text-subtle mt-0.5">
          {t("ai_priv")}{" "}
          <a href="/privacy" className="underline hover:text-subtle">Privacy</a>
        </p>
      </div>

    </div>
  );
}
