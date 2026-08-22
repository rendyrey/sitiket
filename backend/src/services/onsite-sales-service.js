import * as eventsRepository from "../repositories/events-repository.js";
import * as onsiteSalesRepository from "../repositories/onsite-sales-repository.js";
import * as ticketTypesRepository from "../repositories/ticket-types-repository.js";
import { badRequest, forbidden, notFound } from "../utils/http-error.js";
import { assertCanScanEvent } from "./ticket-service.js";

/**
 * On-the-spot (door) sales tally — see the onsite_ticket_sales migration.
 * Recording and reading follow gate-crew authorization (owner, accepted
 * staff, super_admin), the same circle that works the door.
 */

const assertEventExists = async (eventId) => {
  const event = await eventsRepository.findById(eventId);
  if (!event) throw notFound("EVENT_NOT_FOUND", "Event not found");
  return event;
};

/**
 * @param {string} eventId
 * @param {{ sub: string, role: string }} requester
 */
export const list = async (eventId, requester) => {
  await assertEventExists(eventId);
  await assertCanScanEvent(eventId, requester);
  return onsiteSalesRepository.listByEvent(eventId);
};

/**
 * Records one tally entry — a live "+2 Regular, cash" at the gate or a bulk
 * end-of-event "25× Regular". `unitPrice` defaults to the tier's price.
 * @param {string} eventId
 * @param {{ sub: string, role: string }} requester
 * @param {{ ticketTypeId: string, quantity: number, unitPrice?: number, note?: string }} input
 */
export const record = async (eventId, requester, input) => {
  await assertEventExists(eventId);
  await assertCanScanEvent(eventId, requester);

  const ticketType = await ticketTypesRepository.findById(input.ticketTypeId);
  if (!ticketType || ticketType.event_id !== eventId) {
    throw badRequest("INVALID_TICKET_TYPE", "Ticket type does not belong to this event");
  }

  return onsiteSalesRepository.create({
    eventId,
    ticketTypeId: input.ticketTypeId,
    quantity: input.quantity,
    unitPrice: input.unitPrice ?? ticketType.price,
    note: input.note,
    recordedBy: requester.sub,
  });
};

/**
 * Deletes one entry — the organizer/super_admin can remove any (supervision),
 * gate staff only their own (typo fixes at the gate).
 * @param {string} eventId
 * @param {{ sub: string, role: string }} requester
 * @param {string} saleId
 */
export const remove = async (eventId, requester, saleId) => {
  const event = await assertEventExists(eventId);

  const sale = await onsiteSalesRepository.findById(saleId);
  if (!sale || sale.event_id !== eventId) throw notFound("ONSITE_SALE_NOT_FOUND", "Door sale entry not found");

  const isOwnerOrSuperAdmin = requester.role === "super_admin" || event.owner_id === requester.sub;
  if (!isOwnerOrSuperAdmin && sale.recorded_by !== requester.sub) {
    throw forbidden("NOT_YOUR_ENTRY", "Only the organizer or whoever recorded this entry can delete it");
  }

  await onsiteSalesRepository.remove(saleId);
};
