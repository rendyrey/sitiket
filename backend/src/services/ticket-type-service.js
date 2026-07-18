import { ticketCategoriesRepository } from "../repositories/ticket-categories-repository.js";
import * as ticketTypesRepository from "../repositories/ticket-types-repository.js";
import { getOwnedEventOrThrow } from "./event-service.js";
import { badRequest, notFound } from "../utils/http-error.js";

const assertCategoryIsUsable = async (categoryId) => {
  const category = await ticketCategoriesRepository.findById(categoryId);
  if (!category || !category.is_active) {
    throw badRequest("INVALID_TICKET_CATEGORY", "Ticket category does not exist or is inactive");
  }
};

/** Public — only tiers currently on sale, for the event's buyer-facing page. */
export const listPublic = (eventId) => ticketTypesRepository.listByEvent(eventId, { activeOnly: true });

/**
 * @param {string} eventId
 * @param {{ sub: string, role: string }} requester
 */
export const listForOwner = async (eventId, requester) => {
  await getOwnedEventOrThrow(eventId, requester);
  return ticketTypesRepository.listByEvent(eventId);
};

/**
 * @param {string} eventId
 * @param {{ sub: string, role: string }} requester
 * @param {object} input - see schemas/ticket-type-schemas.js
 */
export const create = async (eventId, requester, input) => {
  await getOwnedEventOrThrow(eventId, requester);
  await assertCategoryIsUsable(input.categoryId);
  return ticketTypesRepository.create({ ...input, eventId });
};

/**
 * @param {string} eventId
 * @param {{ sub: string, role: string }} requester
 * @param {string} ticketTypeId
 * @param {object} patch
 */
export const update = async (eventId, requester, ticketTypeId, patch) => {
  await getOwnedEventOrThrow(eventId, requester);

  const ticketType = await ticketTypesRepository.findById(ticketTypeId);
  if (!ticketType || ticketType.event_id !== eventId) throw notFound("TICKET_TYPE_NOT_FOUND", "Ticket type not found");

  if (patch.categoryId) await assertCategoryIsUsable(patch.categoryId);

  try {
    return await ticketTypesRepository.update(ticketTypeId, patch);
  } catch (error) {
    if (error?.code === "ER_CHECK_CONSTRAINT_VIOLATED") {
      throw badRequest("QUANTITY_BELOW_SOLD", "quantityTotal cannot be lower than the quantity already sold");
    }
    throw error;
  }
};
