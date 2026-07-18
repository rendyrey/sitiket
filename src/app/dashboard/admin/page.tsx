import type { Metadata } from "next";
import Link from "next/link";
import EventsTable from "@/features/admin/components/events-table";
import { listMyEvents } from "@/features/admin/lib/api";

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

      <div className="mt-8">
        <EventsTable events={events} />
      </div>
    </div>
  );
}
