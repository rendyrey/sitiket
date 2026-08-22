"use client";

import { QRCodeCanvas, QRCodeSVG } from "qrcode.react";
import { useEffect, useRef, useState } from "react";
import toast from "react-hot-toast";
import { getOrderTicketsAction, resendOrderTicketsAction } from "@/features/admin/lib/actions";
import type { Order, Ticket } from "@/lib/api/types";

/**
 * "08123…" / "+62 812-3…" → "62812…" — the digits-only international form
 * wa.me links require. Returns null when the phone is unusable.
 */
const toWhatsAppNumber = (phone: string): string | null => {
  const digits = phone.replace(/\D/g, "");
  if (digits.length < 8) return null;
  if (digits.startsWith("0")) return `62${digits.slice(1)}`;
  return digits;
};

/**
 * The organizer's delivery fallback when the ticket email never lands:
 * per-ticket QR downloads (to attach in WhatsApp), a wa.me link prefilled
 * with the codes + the buyer's order page, and a re-send of the email itself.
 */
export default function OrderTicketsPanel({ order }: { order: Order }) {
  const [tickets, setTickets] = useState<Ticket[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [resending, setResending] = useState(false);

  useEffect(() => {
    let cancelled = false;
    void getOrderTicketsAction(order.id).then((result) => {
      if (cancelled) return;
      // Void tickets (refunded) must never be forwarded to a buyer.
      if (result.ok) setTickets(result.data.filter((ticket) => ticket.status !== "void"));
      else setError(result.message);
    });
    return () => {
      cancelled = true;
    };
  }, [order.id]);

  const handleResend = async () => {
    setResending(true);
    const result = await resendOrderTicketsAction(order.id);
    setResending(false);
    if (!result.ok) {
      toast.error(result.message);
      return;
    }
    toast.success(`Ticket email queued to ${result.data.sentTo}.`);
  };

  const openWhatsApp = () => {
    if (!tickets || tickets.length === 0) return;
    const orderLink = `${window.location.origin}/orders/${order.id}?email=${encodeURIComponent(order.buyerEmail)}`;
    const eventName = tickets[0].eventName;
    const codeLines = tickets.map((ticket) => `- ${ticket.ticketCode} (${ticket.ticketTypeName})`).join("\n");
    const message = [
      `Hi ${order.buyerName}! Here ${tickets.length === 1 ? "is your ticket" : `are your ${tickets.length} tickets`} for ${eventName}:`,
      codeLines,
      `View and download the QR codes here: ${orderLink}`,
      "See you at the gate!",
    ].join("\n\n");
    const number = toWhatsAppNumber(order.buyerPhone ?? "");
    const url = number
      ? `https://wa.me/${number}?text=${encodeURIComponent(message)}`
      : `https://api.whatsapp.com/send?text=${encodeURIComponent(message)}`;
    window.open(url, "_blank", "noopener");
  };

  if (error) return <p className="bg-paper px-4 pb-4 text-xs font-semibold text-red-600">{error}</p>;
  if (!tickets) return <p className="bg-paper px-4 pb-4 text-xs font-semibold text-black/40">Loading tickets…</p>;
  if (tickets.length === 0) return null;

  return (
    <div className="space-y-3 bg-paper px-4 pb-4">
      <div className="border-2 border-black/10 bg-white p-3">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <span className="text-[10px] font-bold uppercase tracking-widest text-black/40">
              Tickets &amp; QR codes
            </span>
            <p className="mt-1 text-xs text-black/55">
              Email didn&apos;t arrive? Re-send it, or download the QR{tickets.length === 1 ? "" : "s"} and forward
              {tickets.length === 1 ? " it" : " them"} on WhatsApp ({order.buyerPhone}).
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <button type="button" disabled={resending} onClick={() => void handleResend()} className="button button-dark disabled:opacity-50">
              {resending ? "Sending…" : "Re-send email"}
            </button>
            <button type="button" onClick={openWhatsApp} className="button button-lime">
              Send via WhatsApp
            </button>
          </div>
        </div>
        <div className="mt-3 grid gap-3 border-t border-black/10 pt-3 sm:grid-cols-2 lg:grid-cols-3">
          {tickets.map((ticket) => (
            <TicketQrCard key={ticket.id} ticket={ticket} />
          ))}
        </div>
      </div>
    </div>
  );
}

function TicketQrCard({ ticket }: { ticket: Ticket }) {
  const boxRef = useRef<HTMLDivElement>(null);

  // The visible QR is a crisp SVG; the hidden canvas is its high-resolution
  // twin, rendered only to be exported as the downloadable PNG.
  const download = () => {
    const canvas = boxRef.current?.querySelector("canvas");
    if (!canvas) return;
    const link = document.createElement("a");
    link.href = canvas.toDataURL("image/png");
    link.download = `sitiket-${ticket.eventSlug}-${ticket.ticketCode}.png`;
    link.click();
  };

  return (
    <div ref={boxRef} className="flex items-center gap-3 border border-black/10 p-3">
      <div className="shrink-0 border-2 border-ink bg-white p-1.5">
        <QRCodeSVG value={ticket.qrPayload} size={72} level="M" />
      </div>
      <div className="hidden">
        <QRCodeCanvas value={ticket.qrPayload} size={600} marginSize={4} level="M" />
      </div>
      <div className="min-w-0">
        <p className="truncate text-xs font-black uppercase">{ticket.ticketTypeName}</p>
        <p className="mt-0.5 break-all text-[10px] font-bold uppercase tracking-widest text-black/40">{ticket.ticketCode}</p>
        <p className="mt-0.5 text-[10px] font-bold uppercase text-black/55">{ticket.status === "used" ? "Checked in" : ticket.status}</p>
        <button type="button" onClick={download} className="mt-1.5 text-xs font-black uppercase text-link hover:underline">
          Download PNG
        </button>
      </div>
    </div>
  );
}
