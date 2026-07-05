"use client";

import { LANGS } from "@/lib/site-i18n";
import { useLang } from "@/contexts/LangContext";

const SHORT: Record<string, string> = {
  en: "EN",
  hinglish: "Hin",
  hi: "हि",
};

export default function LanguageSwitcher({ compact = false }: { compact?: boolean }) {
  const { lang, setLang } = useLang();

  if (compact) {
    return (
      <div className="flex items-center gap-0.5 rounded-full border border-border bg-surface2 p-0.5">
        {LANGS.map((l) => (
          <button
            key={l.code}
            onClick={() => setLang(l.code)}
            title={l.label}
            className={`rounded-full px-2.5 py-1 text-xs font-bold transition-colors ${
              lang === l.code
                ? "bg-accent text-onaccent"
                : "text-subtle hover:text-fg"
            }`}
          >
            {SHORT[l.code]}
          </button>
        ))}
      </div>
    );
  }

  return (
    <div className="flex items-center gap-1">
      <span className="text-xs text-muted">🌐</span>
      {LANGS.map((l) => (
        <button
          key={l.code}
          onClick={() => setLang(l.code)}
          className={`rounded-lg px-3 py-1.5 text-sm font-medium transition-colors ${
            lang === l.code
              ? "bg-surface text-accent"
              : "text-subtle hover:text-fg"
          }`}
        >
          {l.label}
        </button>
      ))}
    </div>
  );
}
