"use client";

import { useState } from "react";
import { track } from "@vercel/analytics";
import { useLang } from "@/contexts/LangContext";
import { subscribeLaunch } from "@/lib/launch-api";
import { EXTENSION_PUBLISHED, CHROME_STORE_URL, INSTALL_CTA_KEY } from "@/lib/constants";

type Variant = "primary" | "secondary";
type State = "idle" | "loading" | "done" | "error";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function btnCls(variant: Variant) {
  const base =
    "inline-block rounded-xl px-6 py-3.5 text-sm font-bold text-center transition-colors";
  return variant === "secondary"
    ? `${base} border border-border text-accent hover:border-accent`
    : `${base} bg-accent text-onaccent hover:bg-blue`;
}

export default function NotifyCTA({
  variant = "primary",
  className = "",
}: {
  variant?: Variant;
  className?: string;
}) {
  const { t } = useLang();
  const [open, setOpen] = useState(false);
  const [email, setEmail] = useState("");
  const [touched, setTouched] = useState(false);
  const [state, setState] = useState<State>("idle");
  const [errMsg, setErrMsg] = useState("");
  const [already, setAlready] = useState(false);

  // Extension is live → skip the waitlist, link straight to the store.
  if (EXTENSION_PUBLISHED) {
    return (
      <a href={CHROME_STORE_URL} target="_blank" rel="noopener" className={`${btnCls(variant)} ${className}`}>
        {t(INSTALL_CTA_KEY)}
      </a>
    );
  }

  const emailValid = EMAIL_RE.test(email.trim());
  const showError = touched && email.length > 0 && !emailValid;

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!emailValid) {
      setTouched(true);
      return;
    }
    setState("loading");
    setErrMsg("");
    track("notify_submit");
    try {
      const r = await subscribeLaunch(email.trim());
      setAlready(r.alreadySubscribed);
      setState("done");
    } catch (err) {
      const m = err instanceof Error ? err.message : "failed";
      if (m === "invalid_email") {
        setState("idle");
        setTouched(true);
        return;
      }
      setErrMsg(m === "rate_limit" ? "Thodi der baad try karein." : "Kuch issue aaya. Dobara try karein.");
      setState("error");
    }
  }

  if (state === "done") {
    return (
      <div className={`rounded-xl border border-green/30 bg-green/5 px-4 py-3 text-sm ${className}`}>
        <span className="font-bold text-green">✅ {already ? "Already on the list!" : "Done!"}</span>{" "}
        <span className="text-subtle">Launch pe tumhe email milega.</span>
      </div>
    );
  }

  if (!open) {
    return (
      <button
        onClick={() => {
          setOpen(true);
          track("notify_open", { variant });
        }}
        className={`${btnCls(variant)} ${className}`}
      >
        {t(INSTALL_CTA_KEY)}
      </button>
    );
  }

  return (
    <form onSubmit={submit} className={`w-full max-w-sm text-left ${className}`} noValidate>
      <label htmlFor="notify-email" className="mb-1 block text-xs font-semibold text-subtle">
        Email — launch update ke liye
      </label>
      <div className="flex gap-2">
        <input
          id="notify-email"
          type="email"
          autoFocus
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          onBlur={() => setTouched(true)}
          placeholder="you@email.com"
          aria-invalid={showError}
          aria-describedby="notify-consent"
          className={`flex-1 rounded-xl border bg-surface px-3 py-2.5 text-sm text-fg outline-none focus:border-accent ${
            showError || state === "error" ? "border-pink" : "border-border"
          }`}
        />
        <button
          type="submit"
          disabled={state === "loading"}
          className="rounded-xl bg-accent px-4 py-2.5 text-sm font-bold text-onaccent transition-colors hover:bg-blue disabled:opacity-50"
        >
          {state === "loading" ? "…" : "Notify"}
        </button>
      </div>
      {showError && <p className="mt-1 text-xs text-pink">Sahi email daalein.</p>}
      {state === "error" && <p className="mt-1 text-xs text-pink">{errMsg}</p>}
      <p id="notify-consent" className="mt-1.5 text-xs text-subtle">
        Sirf launch update ke liye. Kabhi spam nahi — ek click mein unsubscribe.
      </p>
    </form>
  );
}
