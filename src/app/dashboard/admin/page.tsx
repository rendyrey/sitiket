import type { Metadata } from "next";
import Link from "next/link";
import EventStatusBadge from "@/features/admin/components/event-status-badge";
import { listMyEvents } from "@/features/admin/lib/api";
import { formatEventDate } from "@/features/events/lib/format";

export const metadata: Metadata = { title: "My events" };

export default async function AdminEventsPage() {
  const { events } = await listMyEvents({ pageSize: 100 });

  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-4">
        <h1 className="text-3xl font-black uppercase">My events</h1>
        <Link href="/dashboard/admin/events/new" className="button button-dark">
          + Create event
        </Link>
      </div>

      <div className="mt-8 space-y-3">
        {events.length === 0 && (
          <p className="border-2 border-black/15 bg-white p-6 text-sm font-semibold text-black/50">
            No events yet — create your first one.
          </p>
        )}
        {events.map((event) => (
          <Link
            key={event.id}
            href={`/dashboard/admin/events/${event.slug}`}
            className="flex flex-wrap items-center justify-between gap-4 border-2 border-ink bg-white p-5 transition-colors hover:bg-paper"
          >
            <div className="min-w-0">
              <p className="truncate text-lg font-black uppercase">{event.name}</p>
              <p className="text-xs text-black/40">
                {event.category.name} · {formatEventDate(event.startDate)}
                {!event.isVisible && " · Hidden"}
              </p>
            </div>
            <EventStatusBadge status={event.status} />
          </Link>
        ))}
      </div>
    </div>
  );
}
