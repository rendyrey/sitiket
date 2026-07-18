import { QRCodeSVG } from "qrcode.react";
import type { Ticket } from "@/lib/api/types";

const STATUS_LABEL: Record<Ticket["status"], string> = {
  issued: "Ready to scan",
  used: "Checked in",
  void: "Voided",
};

export default function TicketsList({ tickets }: { tickets: Ticket[] }) {
  if (tickets.length === 0) return null;

  return (
    <div className="grid gap-5 sm:grid-cols-2">
      {tickets.map((ticket) => (
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
  );
}
