import { apiFetch } from "@/lib/api/client";
import { toTicketType } from "@/lib/api/normalize";
import type { RawTicketType, TicketType } from "@/lib/api/types";

/**
 * Server-only. ALL of an event's tiers — hidden ones included — for the
 * door-sale tally dropdown (door pricing often lives on a hidden "OTS"
 * tier). Gate-crew authorized: owner, accepted staff, or super_admin.
 */
export const listGateTicketTypes = async (eventId: string): Promise<TicketType[]> => {
  const raw = await apiFetch<RawTicketType[]>(`/api/events/${eventId}/ticket-types/gate`);
  return raw.map(toTicketType);
};
