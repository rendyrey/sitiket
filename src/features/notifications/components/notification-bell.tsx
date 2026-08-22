"use client";

import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";
import { BellIcon } from "@/components/site/icons";
import type { AppNotification } from "@/lib/api/types";
import { fetchNotificationsAction, markNotificationsReadAction } from "../lib/actions";

/** Slow poll — notifications also refresh on mount and whenever the dropdown opens. */
const POLL_INTERVAL_MS = 60_000;

const timeAgo = (iso: string) => {
  const minutes = Math.max(0, Math.floor((Date.now() - new Date(iso).getTime()) / 60_000));
  if (minutes < 1) return "just now";
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  return `${Math.floor(hours / 24)}d ago`;
};

/**
 * The top-right notification bell (spec: dropdown listing new ticket/merch
 * buyers). Renders only for signed-in users — the header mounts it
 * conditionally. Opening the dropdown counts as reading: the badge clears,
 * while rows keep their unread highlight until the next open.
 */
export default function NotificationBell({ variant = "dark" }: { variant?: "dark" | "light" }) {
  const [open, setOpen] = useState(false);
  const [notifications, setNotifications] = useState<AppNotification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const containerRef = useRef<HTMLDivElement>(null);

  const refresh = useCallback(async () => {
    const result = await fetchNotificationsAction();
    if (result.ok) {
      setNotifications(result.data.notifications);
      setUnreadCount(result.data.unreadCount);
    }
  }, []);

  useEffect(() => {
    // The initial fetch rides a zero-delay timeout so the effect body itself
    // never sets state synchronously (react-hooks/set-state-in-effect).
    const initial = setTimeout(() => void refresh(), 0);
    const interval = setInterval(() => void refresh(), POLL_INTERVAL_MS);
    return () => {
      clearTimeout(initial);
      clearInterval(interval);
    };
  }, [refresh]);

  // Close when clicking/tapping outside or pressing Escape.
  useEffect(() => {
    if (!open) return;
    const onPointerDown = (event: PointerEvent) => {
      if (!containerRef.current?.contains(event.target as Node)) setOpen(false);
    };
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpen(false);
    };
    document.addEventListener("pointerdown", onPointerDown);
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("pointerdown", onPointerDown);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [open]);

  // Opening the list is what "reads" it: fetch the fresh rows, then mark them
  // read server-side. Local readAt values are left untouched so the unread
  // highlight survives while the dropdown stays open.
  const openAndMarkRead = useCallback(async () => {
    const result = await fetchNotificationsAction();
    if (!result.ok) return;
    setNotifications(result.data.notifications);
    setUnreadCount(result.data.unreadCount);
    if (result.data.unreadCount === 0) return;
    const marked = await markNotificationsReadAction();
    if (marked.ok) setUnreadCount(marked.data.unreadCount);
  }, []);

  const toggleOpen = () => {
    const next = !open;
    setOpen(next);
    if (next) void openAndMarkRead();
  };

  const buttonClasses =
    variant === "dark"
      ? "border-white/30 hover:border-lime hover:text-lime"
      : "border-black/25 text-black hover:border-black hover:bg-ink hover:text-lime";

  return (
    <div ref={containerRef} className="relative">
      <button
        type="button"
        onClick={toggleOpen}
        className={`relative grid h-11 w-11 place-items-center border transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-lime ${buttonClasses}`}
        aria-label={unreadCount > 0 ? `Notifications, ${unreadCount} unread` : "Notifications"}
        aria-expanded={open}
        aria-haspopup="true"
      >
        <BellIcon className="h-5 w-5" />
        {unreadCount > 0 && (
          <span className="absolute -right-1.5 -top-1.5 grid h-5 min-w-5 place-items-center bg-lime px-1 text-[10px] font-black tabular-nums text-black">
            {unreadCount > 99 ? "99+" : unreadCount}
          </span>
        )}
      </button>

      {open && (
        /*
          Phones: fixed + inset-x, spanning the viewport just below the 72px
          header — anchoring right-0 to the bell would push the panel off the
          left edge, since the cart and menu buttons sit between the bell and
          the screen edge. sm+ goes back to hanging off the bell itself.
        */
        <div className="fixed inset-x-3 top-[80px] z-[70] border-2 border-ink bg-white text-black shadow-[6px_6px_0_0_#0a0a0a] sm:absolute sm:inset-x-auto sm:right-0 sm:top-[calc(100%+8px)] sm:w-[min(92vw,380px)]">
          <header className="border-b-2 border-ink bg-paper px-4 py-3">
            <span className="text-xs font-black uppercase tracking-widest">Notifications</span>
          </header>
          <ul className="max-h-[60vh] overflow-y-auto">
            {notifications.length === 0 && (
              <li className="px-4 py-8 text-center text-sm font-semibold text-black/40">Nothing yet.</li>
            )}
            {notifications.map((notification) => {
              const isUnread = !notification.readAt;
              const content = (
                <>
                  <span className="flex items-baseline justify-between gap-3">
                    <strong className="text-sm font-extrabold leading-tight">{notification.title}</strong>
                    <span className="shrink-0 text-[10px] font-semibold uppercase text-black/35">{timeAgo(notification.createdAt)}</span>
                  </span>
                  <span className="mt-1 block text-xs leading-5 text-black/55">{notification.body}</span>
                </>
              );
              const rowClasses = `block border-b border-black/10 px-4 py-3 last:border-b-0 ${isUnread ? "bg-lime/15" : ""}`;
              return (
                <li key={notification.id}>
                  {notification.href ? (
                    <Link href={notification.href} onClick={() => setOpen(false)} className={`${rowClasses} transition-colors hover:bg-paper`}>
                      {content}
                    </Link>
                  ) : (
                    <span className={rowClasses}>{content}</span>
                  )}
                </li>
              );
            })}
          </ul>
        </div>
      )}
    </div>
  );
}
