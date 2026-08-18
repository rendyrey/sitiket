import type { TicketType } from "@/lib/api/types";

/**
 * Whether a ticket type is currently purchasable based on its optional sales
 * window. This mirrors the backend guard in `order-service.createOrder`
 * (`TICKET_TYPE_NOT_ON_SALE`) — the server is the source of truth that blocks
 * out-of-window purchases even via direct API calls; this is the matching
 * display state so buyers see *why* a ticket can't be bought.
 */
export type SalesStatus = "scheduled" | "on_sale" | "ended";

type SalesWindow = Pick<TicketType, "saleStartAt" | "saleEndAt">;

export function getSalesStatus(ticket: SalesWindow, now: number = Date.now()): SalesStatus {
  const start = ticket.saleStartAt ? Date.parse(ticket.saleStartAt) : null;
  const end = ticket.saleEndAt ? Date.parse(ticket.saleEndAt) : null;
  if (start !== null && !Number.isNaN(start) && now < start) return "scheduled";
  if (end !== null && !Number.isNaN(end) && now > end) return "ended";
  return "on_sale";
}
