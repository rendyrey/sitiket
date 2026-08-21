"use server";

import { toActionResult, type ActionResult } from "@/lib/api/action-result";
import { apiRequest } from "@/lib/api/client";
import { toAppNotification } from "@/lib/api/normalize";
import type { AppNotification, RawNotification } from "@/lib/api/types";

/**
 * The bell's poll — latest notifications + unread count in one round-trip.
 * Called from the client on mount, on dropdown open, and on a slow interval.
 */
export async function fetchNotificationsAction(): Promise<
  ActionResult<{ notifications: AppNotification[]; unreadCount: number }>
> {
  return toActionResult(
    () => apiRequest<{ data: RawNotification[]; meta: { unreadCount: number } }>("/api/notifications"),
    ({ data, meta }) => ({ notifications: data.map(toAppNotification), unreadCount: meta.unreadCount }),
  );
}

/** Marks the given ids (or, with none, everything) read; returns the fresh unread count. */
export async function markNotificationsReadAction(ids?: string[]): Promise<ActionResult<{ unreadCount: number }>> {
  return toActionResult(() =>
    apiRequest<{ data: { unreadCount: number } }>("/api/notifications/read", {
      method: "POST",
      body: ids?.length ? { ids } : {},
    }).then((json) => json.data),
  );
}
