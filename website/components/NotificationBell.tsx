"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { Bell } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { useLang } from "@/contexts/LangContext";
import { getNotifications, markNotificationsRead, type Notif } from "@/lib/notifications-api";

export default function NotificationBell() {
  const { user } = useAuth();
  const { t } = useLang();
  const [open, setOpen] = useState(false);
  const [items, setItems] = useState<Notif[]>([]);
  const [unread, setUnread] = useState(0);

  useEffect(() => {
    if (!user) return;
    let alive = true;
    getNotifications()
      .then((d) => {
        if (alive) {
          setItems(d.items);
          setUnread(d.unread);
        }
      })
      .catch(() => {});
    return () => {
      alive = false;
    };
  }, [user]);

  if (!user) return null;

  async function toggle() {
    const next = !open;
    setOpen(next);
    if (next) {
      try {
        const d = await getNotifications();
        setItems(d.items);
        if (d.unread > 0) await markNotificationsRead();
        setUnread(0);
      } catch {
        /* ignore */
      }
    }
  }

  // Reward notifications are stored as __rw:<reason>:<n> so they localize at render time.
  function label(msg: string): string {
    const m = msg.match(/^__rw:(\w+):(-?\d+)$/);
    return m ? t(`notif_${m[1]}`, { n: m[2] }) : msg;
  }

  return (
    <div className="relative">
      <button
        onClick={toggle}
        className="relative flex h-9 w-9 items-center justify-center rounded-full border border-border bg-surface2 text-base transition-colors hover:border-accent"
        aria-label={t("notif_title")}
      >
        <Bell className="h-4 w-4 text-accent" strokeWidth={2.5} />
        {unread > 0 && (
          <span className="absolute -right-0.5 -top-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-pink px-1 text-[10px] font-bold text-white">
            {unread > 9 ? "9+" : unread}
          </span>
        )}
      </button>

      {open && (
        <>
          <button className="fixed inset-0 z-40 cursor-default" aria-label="Close" onClick={() => setOpen(false)} />
          <div className="absolute right-0 z-50 mt-2 w-72 overflow-hidden rounded-xl border border-border bg-surface2 shadow-2xl">
            <div className="border-b border-border px-4 py-2.5 text-sm font-bold">{t("notif_title")}</div>
            {items.length === 0 ? (
              <p className="px-4 py-8 text-center text-sm text-muted">{t("notif_empty")}</p>
            ) : (
              <div className="max-h-80 divide-y divide-border overflow-y-auto">
                {items.map((n) => {
                  const body = (
                    <div className={`px-4 py-3 ${n.read ? "" : "bg-accent/5"}`}>
                      <div className="text-sm font-medium leading-snug">{label(n.message)}</div>
                      <div className="mt-0.5 text-xs text-muted">
                        {new Date(n.createdAt).toLocaleDateString("en-IN", { day: "numeric", month: "short" })}
                      </div>
                    </div>
                  );
                  return n.link ? (
                    <Link key={n.id} href={n.link} onClick={() => setOpen(false)} className="block transition-colors hover:bg-surface">
                      {body}
                    </Link>
                  ) : (
                    <div key={n.id}>{body}</div>
                  );
                })}
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}
