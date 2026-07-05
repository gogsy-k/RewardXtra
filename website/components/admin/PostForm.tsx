"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import MarkdownEditor from "@/components/MarkdownEditor";
import { adminCreatePost, adminUpdatePost, adminDeletePost, type AdminPostInput } from "@/lib/admin-api";
import { cloudinaryEnabled, uploadImage } from "@/lib/cloudinary";
import { type Post, type PostLang, LANG_LABEL } from "@/lib/posts";

const inputCls =
  "w-full rounded-xl border border-border bg-surface2 px-3.5 py-2.5 text-sm text-fg outline-none focus:border-accent";

// ISO → value for <input type="datetime-local"> (local time, no seconds).
function toLocalInput(iso?: string | null): string {
  if (!iso) return "";
  const d = new Date(iso);
  if (isNaN(d.getTime())) return "";
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

export default function PostForm({ post }: { post?: Post }) {
  const router = useRouter();
  const editing = !!post;

  const [title, setTitle] = useState(post?.title ?? "");
  const [excerpt, setExcerpt] = useState(post?.excerpt ?? "");
  const [category, setCategory] = useState(post?.category ?? "");
  const [coverImage, setCoverImage] = useState(post?.coverImage ?? "");
  const [content, setContent] = useState(post?.content ?? "");
  const [lang, setLang] = useState<PostLang>(post?.lang ?? "hinglish");
  const [translationGroup, setTranslationGroup] = useState(post?.translationGroup ?? "");
  const [publishAt, setPublishAt] = useState(toLocalInput(post?.publishedAt));
  const [busy, setBusy] = useState(false);
  const [coverUploading, setCoverUploading] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  async function save(status: "draft" | "published") {
    setErr(null);
    if (!title.trim() || !content.trim()) {
      setErr("Title and content are required.");
      return;
    }
    setBusy(true);
    const input: AdminPostInput = {
      title, excerpt, category, coverImage, content, status,
      lang, translationGroup: translationGroup.trim() || undefined,
      // Future time = scheduled; empty = publish now (when status=published).
      publishedAt: publishAt ? new Date(publishAt).toISOString() : null,
    };
    try {
      if (editing) await adminUpdatePost(post.id, input);
      else await adminCreatePost(input);
      router.push("/admin");
      router.refresh();
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Save failed");
      setBusy(false);
    }
  }

  async function del() {
    if (!editing) return;
    // eslint-disable-next-line no-alert
    if (!window.confirm("Delete this post permanently?")) return;
    setBusy(true);
    try {
      await adminDeletePost(post.id);
      router.push("/admin");
      router.refresh();
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Delete failed");
      setBusy(false);
    }
  }

  async function onCoverFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    setCoverUploading(true);
    setErr(null);
    try {
      setCoverImage(await uploadImage(file));
    } catch (ex) {
      setErr(ex instanceof Error ? ex.message : "Upload failed");
    } finally {
      setCoverUploading(false);
    }
  }

  return (
    <div className="space-y-5">
      <div>
        <label className="mb-1 block text-xs font-semibold text-subtle">Title</label>
        <input className={inputCls} value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Post title" />
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label className="mb-1 block text-xs font-semibold text-subtle">Category</label>
          <input
            className={inputCls}
            value={category}
            onChange={(e) => setCategory(e.target.value)}
            placeholder="e.g. Credit Cards, Finance"
          />
        </div>
        <div>
          <label className="mb-1 block text-xs font-semibold text-subtle">Cover image URL</label>
          <div className="flex gap-2">
            <input
              className={inputCls}
              value={coverImage}
              onChange={(e) => setCoverImage(e.target.value)}
              placeholder="https://…"
            />
            {cloudinaryEnabled && (
              <label className="shrink-0 cursor-pointer rounded-xl border border-border bg-surface px-3 py-2 text-xs font-semibold text-accent hover:border-accent">
                {coverUploading ? "…" : "📤"}
                <input type="file" accept="image/*" hidden onChange={onCoverFile} />
              </label>
            )}
          </div>
        </div>
      </div>

      {coverImage && (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={coverImage} alt="" loading="lazy" className="max-h-48 rounded-xl border border-border object-cover" />
      )}

      {/* Multilingual: language + translation group (links versions for hreflang/SEO) */}
      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label className="mb-1 block text-xs font-semibold text-subtle">Language</label>
          <select className={inputCls} value={lang} onChange={(e) => setLang(e.target.value as PostLang)}>
            {(["hinglish", "en", "hi"] as PostLang[]).map((l) => (
              <option key={l} value={l}>{LANG_LABEL[l]}</option>
            ))}
          </select>
        </div>
        <div>
          <label className="mb-1 block text-xs font-semibold text-subtle">Translation group (optional)</label>
          <input
            className={inputCls}
            value={translationGroup}
            onChange={(e) => setTranslationGroup(e.target.value)}
            placeholder="e.g. rbi-rules-2026"
          />
          <p className="mt-1 text-[11px] text-muted">
            Same id across the EN / Hindi / Hinglish versions of one article → links them (hreflang + "Read in" switcher).
          </p>
        </div>
      </div>

      <div>
        <label className="mb-1 block text-xs font-semibold text-subtle">Publish at (schedule)</label>
        <input
          type="datetime-local"
          className={`${inputCls} max-w-xs`}
          value={publishAt}
          onChange={(e) => setPublishAt(e.target.value)}
        />
        <p className="mt-1 text-[11px] text-muted">
          Empty = publish now. A future time schedules it — the article auto-goes-live then (no manual step).
          {publishAt && new Date(publishAt) > new Date() && (
            <span className="ml-1 font-semibold text-accent">
              Scheduled for {new Date(publishAt).toLocaleString("en-IN")}.
            </span>
          )}
        </p>
      </div>

      <div>
        <label className="mb-1 block text-xs font-semibold text-subtle">Excerpt (short summary)</label>
        <textarea
          className={inputCls}
          rows={2}
          value={excerpt}
          onChange={(e) => setExcerpt(e.target.value)}
          placeholder="One or two lines shown in the news list."
        />
      </div>

      <div>
        <label className="mb-1 block text-xs font-semibold text-subtle">Content</label>
        <MarkdownEditor value={content} onChange={setContent} />
      </div>

      {err && <p className="text-sm text-pink">{err}</p>}

      <div className="flex flex-wrap items-center gap-3 border-t border-border pt-4">
        <button
          onClick={() => save("published")}
          disabled={busy}
          className="rounded-xl bg-accent px-5 py-2.5 text-sm font-bold text-onaccent transition-colors hover:bg-blue disabled:opacity-50"
        >
          {publishAt && new Date(publishAt) > new Date()
            ? (editing ? "Update & Schedule" : "Schedule")
            : (editing ? "Update & Publish" : "Publish")}
        </button>
        <button
          onClick={() => save("draft")}
          disabled={busy}
          className="rounded-xl border border-border px-5 py-2.5 text-sm font-semibold text-subtle transition-colors hover:text-fg disabled:opacity-50"
        >
          Save draft
        </button>
        {editing && (
          <button
            onClick={del}
            disabled={busy}
            className="ml-auto rounded-xl border border-pink/40 px-4 py-2.5 text-sm font-semibold text-pink transition-colors hover:border-pink disabled:opacity-50"
          >
            Delete
          </button>
        )}
      </div>
    </div>
  );
}
