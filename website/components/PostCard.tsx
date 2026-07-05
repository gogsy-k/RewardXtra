import Link from "next/link";
import { type Post, formatDate, LANG_LABEL } from "@/lib/posts";

export default function PostCard({ post }: { post: Post }) {
  return (
    <Link
      href={`/news/${post.slug}`}
      className="group flex flex-col overflow-hidden rounded-2xl border border-border bg-surface2 transition-colors hover:border-accent"
    >
      <div className="aspect-[16/9] overflow-hidden bg-surface">
        {post.coverImage ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={post.coverImage}
            alt=""
            loading="lazy"
            className="h-full w-full object-cover transition-transform group-hover:scale-105"
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center text-3xl text-muted">📰</div>
        )}
      </div>
      <div className="flex flex-1 flex-col p-5">
        <div className="mb-2 flex flex-wrap items-center gap-1.5">
          {post.category && (
            <span className="w-fit rounded-full border border-border bg-surface px-2.5 py-0.5 text-[11px] font-semibold capitalize text-green">
              {post.category}
            </span>
          )}
          {post.lang && (
            <span className="w-fit rounded-full border border-border bg-surface px-2.5 py-0.5 text-[11px] font-semibold text-subtle">
              {LANG_LABEL[post.lang]}
            </span>
          )}
        </div>
        <h3 className="font-bold leading-snug group-hover:text-accent">{post.title}</h3>
        {post.excerpt && <p className="mt-1.5 line-clamp-2 text-sm text-muted">{post.excerpt}</p>}
        <div className="mt-3 text-[11px] text-muted">
          {post.authorName && <>{post.authorName} · </>}
          {formatDate(post.publishedAt)}
        </div>
      </div>
    </Link>
  );
}
