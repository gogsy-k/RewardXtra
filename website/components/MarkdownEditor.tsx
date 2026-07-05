"use client";

import { useRef, useState } from "react";
import PostBody from "@/components/PostBody";
import { cloudinaryEnabled, uploadImage } from "@/lib/cloudinary";

export default function MarkdownEditor({
  value,
  onChange,
}: {
  value: string;
  onChange: (v: string) => void;
}) {
  const taRef = useRef<HTMLTextAreaElement>(null);
  const [uploading, setUploading] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  function insertAtCursor(text: string) {
    const ta = taRef.current;
    if (!ta) {
      onChange(value + text);
      return;
    }
    const start = ta.selectionStart;
    const end = ta.selectionEnd;
    onChange(value.slice(0, start) + text + value.slice(end));
  }

  async function onFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    setUploading(true);
    setErr(null);
    try {
      const url = await uploadImage(file);
      insertAtCursor(`\n![${file.name}](${url})\n`);
    } catch (ex) {
      setErr(ex instanceof Error ? ex.message : "Upload failed");
    } finally {
      setUploading(false);
    }
  }

  function onUrl() {
    // eslint-disable-next-line no-alert
    const url = window.prompt("Image URL:");
    if (url) insertAtCursor(`\n![](${url})\n`);
  }

  return (
    <div>
      <div className="mb-2 flex flex-wrap items-center gap-2 text-xs">
        {cloudinaryEnabled && (
          <label className="cursor-pointer rounded-lg border border-border bg-surface px-3 py-1.5 font-semibold text-accent hover:border-accent">
            📤 Upload image
            <input type="file" accept="image/*" hidden onChange={onFile} />
          </label>
        )}
        <button
          type="button"
          onClick={onUrl}
          className="rounded-lg border border-border bg-surface px-3 py-1.5 font-semibold text-accent hover:border-accent"
        >
          🔗 Insert image URL
        </button>
        {uploading && <span className="text-muted">uploading…</span>}
        {err && <span className="text-pink">{err}</span>}
        <span className="ml-auto text-muted">Markdown supported</span>
      </div>
      <div className="grid gap-3 lg:grid-cols-2">
        <textarea
          ref={taRef}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={"# Heading\n\nWrite your news here. **bold**, [link](https://…), ![image](url)…"}
          className="min-h-[420px] w-full rounded-xl border border-border bg-surface2 p-4 font-mono text-sm text-fg outline-none focus:border-accent"
        />
        <div className="min-h-[420px] overflow-auto rounded-xl border border-border bg-surface2 p-4">
          <PostBody content={value || "_Live preview…_"} />
        </div>
      </div>
    </div>
  );
}
