"use client";

import { useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useLang } from "@/contexts/LangContext";
import { HREFLANG, LANG_LABEL, type PostLang, type Translation } from "@/lib/posts";

/**
 * Keeps the article in sync with the navbar language:
 * when the user switches the site language and a translation of THIS article
 * exists in that language, navigate to it automatically. Also renders the
 * manual "Read in: …" links (which set the navbar language too, so they don't
 * fight the auto-sync).
 */
export default function ArticleLangBar({
  currentLang,
  currentSlug,
  translations,
}: {
  currentLang: PostLang;
  currentSlug: string;
  translations: Translation[];
}) {
  const { lang, setLang, ready } = useLang();
  const router = useRouter();

  useEffect(() => {
    if (!ready || lang === currentLang) return;
    const match = translations.find((t) => t.lang === lang);
    if (match && match.slug !== currentSlug) {
      router.replace(`/news/${match.slug}`);
    }
  }, [lang, ready, currentLang, currentSlug, translations, router]);

  if (translations.length === 0) return null;

  return (
    <div className="mt-4 flex flex-wrap items-center gap-2 rounded-xl border border-border bg-surface2 px-4 py-2.5 text-sm">
      <span className="text-muted">Read in:</span>
      {translations.map((t) => (
        <Link
          key={t.slug}
          href={`/news/${t.slug}`}
          hrefLang={HREFLANG[t.lang]}
          onClick={() => setLang(t.lang)}
          className="font-bold text-accent hover:underline"
        >
          {LANG_LABEL[t.lang]}
        </Link>
      ))}
    </div>
  );
}
