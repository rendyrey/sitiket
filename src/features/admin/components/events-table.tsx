"use client";

import Link from "next/link";
import DataTable, { type DataTableColumn } from "@/components/ui/data-table";
import EventStatusBadge from "./event-status-badge";
import { formatEventDate } from "@/features/events/lib/format";
import type { Event } from "@/lib/api/types";

export default function EventsTable({ events }: { events: Event[] }) {
  const columns: DataTableColumn<Event>[] = [
    {
      key: "name",
      header: "Event",
      sortAccessor: (event) => event.name.toLowerCase(),
      searchAccessor: (event) => `${event.name} ${event.category.name}`,
      render: (event) => (
        <Link href={`/dashboard/admin/events/${event.slug}`} className="block min-w-0">
          <p className="truncate font-black uppercase">{event.name}</p>
          <p className="text-xs text-black/40">
            {event.category.name}
            {!event.isVisible && " · Hidden"}
          </p>
        </Link>
      ),
    },
    {
      key: "date",
      header: "Date",
      sortAccessor: (event) => new Date(event.startDate).getTime(),
      render: (event) => formatEventDate(event.startDate),
    },
    {
      key: "status",
      header: "Status",
      sortAccessor: (event) => event.status,
      searchAccessor: (event) => event.status,
      align: "right",
      render: (event) => <EventStatusBadge status={event.status} />,
    },
  ];

  return (
    <DataTable
      columns={columns}
      data={events}
      getRowKey={(event) => event.id}
      searchPlaceholder="Search by event or category…"
      emptyMessage="No events yet — create your first one."
    />
  );
}
