"use server";

import { apiFetch } from "@/lib/api/client";
import { toActionResult } from "@/lib/api/action-result";
import type { OnsiteSale, ScanTicketRequest, ScanTicketResult } from "@/lib/api/types";

export async function scanTicketAction(input: ScanTicketRequest) {
  return toActionResult(() => apiFetch<ScanTicketResult>("/api/check-ins/scan", { method: "POST", body: input }));
}

/** The event's door-sale tally entries — gate-crew only (owner, accepted staff, super_admin). */
export async function listOnsiteSalesAction(eventId: string) {
  return toActionResult(() => apiFetch<OnsiteSale[]>(`/api/events/${eventId}/onsite-sales`));
}

/** Records one door-sale tally entry (live at the gate, or a bulk end-of-event count). */
export async function recordOnsiteSaleAction(
  eventId: string,
  input: { ticketTypeId: string; quantity: number; unitPrice?: number; note?: string },
) {
  return toActionResult(() => apiFetch<OnsiteSale>(`/api/events/${eventId}/onsite-sales`, { method: "POST", body: input }));
}

/** Deletes one tally entry — organizer/super_admin any, staff their own. */
export async function deleteOnsiteSaleAction(eventId: string, saleId: string) {
  return toActionResult(() => apiFetch<void>(`/api/events/${eventId}/onsite-sales/${saleId}`, { method: "DELETE" }));
}
