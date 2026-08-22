import type { Metadata } from "next";
import Link from "next/link";
import { listMyTickets } from "@/features/account/lib/api";
import { TicketsList } from "@/features/orders/components";

export const metadata: Metadata = { title: "My tickets" };

/** The buyer's QR tickets, grouped per event — the account area's landing page. */
export default async function AccountTicketsPage() {
  const tickets = await listMyTickets();
  const upcomingTickets = tickets.filter((ticket) => ticket.status !== "void");

  return (
    <div>
      <h1 className="text-3xl font-black uppercase">My tickets</h1>
      <p className="mt-2 max-w-xl text-sm text-black/50">
        Show the QR code at the gate. Each group is one event — the header tells you which is which.
      </p>
      <div className="mt-8 max-w-4xl">
        {upcomingTickets.length === 0 ? (
          <p className="border-2 border-black/15 bg-white p-6 text-sm font-semibold text-black/50">
            No tickets yet.{" "}
            <Link href="/events" className="text-black underline decoration-lime decoration-2 underline-offset-4">
              Find something to go to
            </Link>
            .
          </p>
        ) : (
          <TicketsList tickets={upcomingTickets} />
        )}
      </div>
    </div>
  );
}
