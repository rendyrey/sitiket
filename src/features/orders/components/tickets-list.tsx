import Link from "next/link";
import { QRCodeSVG } from "qrcode.react";
import type { Ticket } from "@/lib/api/types";

const STATUS_LABEL: Record<Ticket["status"], string> = {
  issued: "Ready to scan",
  used: "Checked in",
  void: "Voided",
};

/** "12 Sep 2026" — compact date for the event header line. */
const formatDate = (iso: string): string =>
  new Date(iso).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" });

/** Single date for a one-day event, "start – end" otherwise. */
const formatEventDates = (ticket: Ticket): string => {
  const start = formatDate(ticket.eventStartDate);
  const end = formatDate(ticket.eventEndDate);
  return start === end ? start : `${start} – ${end}`;
};

/**
 * One group of tickets per event, header first — a buyer holding tickets to
 * several events can tell at a glance which QR opens which gate.
 */
interface EventTicketGroup {
  /** Grouping key. Example: `"63f1a2b3-…"` */
  eventId: string;
  /** All context fields are read off the group's first ticket. */
  sample: Ticket;
  tickets: Ticket[];
}

const groupByEvent = (tickets: Ticket[]): EventTicketGroup[] => {
  const groups = new Map<string, EventTicketGroup>();
  for (const ticket of tickets) {
    if (!groups.has(ticket.eventId)) {
      groups.set(ticket.eventId, { eventId: ticket.eventId, sample: ticket, tickets: [] });
    }
    groups.get(ticket.eventId)!.tickets.push(ticket);
  }
  return Array.from(groups.values());
};

export default function TicketsList({ tickets }: { tickets: Ticket[] }) {
  if (tickets.length === 0) return null;

  return (
    <div className="space-y-8">
      {groupByEvent(tickets).map((group) => (
        <section key={group.eventId} className="border-2 border-ink bg-white">
          {/* Event header — which event these QRs belong to, and whose event it is. */}
          <header className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1 border-b-2 border-ink bg-ink px-4 py-3 text-white sm:px-5">
            <div className="min-w-0">
              <Link
                href={`/events/${group.sample.eventSlug}`}
                className="text-base font-black uppercase leading-tight underline decoration-lime decoration-2 underline-offset-4"
              >
                {group.sample.eventName}
              </Link>
              <p className="mt-1 text-xs text-white/60">
                {[formatEventDates(group.sample), group.sample.eventVenueName, group.sample.eventCity]
                  .filter(Boolean)
                  .join(" · ")}
              </p>
            </div>
            <div className="text-right">
              {group.sample.organizerName && (
                <p className="text-xs font-bold uppercase tracking-widest text-lime">by {group.sample.organizerName}</p>
              )}
              <p className="mt-1 text-xs text-white/60">
                {group.tickets.length} ticket{group.tickets.length === 1 ? "" : "s"}
              </p>
            </div>
          </header>

          <div className="grid gap-5 p-4 sm:grid-cols-2 sm:p-5">
            {group.tickets.map((ticket) => (
              <div key={ticket.id} className="border-2 border-ink bg-white p-5 text-center">
                <span className="tag">{ticket.ticketTypeName}</span>
                <div className="mx-auto mt-5 w-fit border-2 border-ink bg-white p-3">
                  <QRCodeSVG value={ticket.qrPayload} size={180} level="M" />
                </div>
                <p className="mt-4 break-all text-[11px] font-bold uppercase tracking-widest text-black/40">{ticket.ticketCode}</p>
                <p className="mt-2 text-sm font-black uppercase">{STATUS_LABEL[ticket.status]}</p>
              </div>
            ))}
          </div>
        </section>
      ))}
    </div>
  );
}
