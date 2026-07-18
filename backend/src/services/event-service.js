import { eventCategoriesRepository } from "../repositories/event-categories-repository.js";
import * as bankAccountsRepository from "../repositories/bank-accounts-repository.js";
import * as eventsRepository from "../repositories/events-repository.js";
import { assertEventOwnerOrSuperAdmin } from "../utils/authorize-event-owner.js";
import { badRequest, conflict, notFound } from "../utils/http-error.js";
import { slugify } from "../utils/slugify.js";

const ALLOWED_STATUS_TRANSITIONS = {
  draft: ["published", "cancelled"],
  published: ["completed", "cancelled"],
  cancelled: [],
  completed: [],
};

/**
 * Generates a unique slug from the event name, appending a short suffix on
 * collision (e.g. "jakarta-noise-fest-2").
 * @param {string} name
 */
const generateUniqueSlug = async (name) => {
  const base = slugify(name);
  let candidate = base;
  let attempt = 1;

  while (await eventsRepository.findBySlug(candidate)) {
    attempt += 1;
    candidate = `${base}-${attempt}`;
  }

  return candidate;
};

const assertCategoryIsUsable = async (categoryId) => {
  const category = await eventCategoriesRepository.findById(categoryId);
  if (!category || !category.is_active) {
    throw badRequest("INVALID_CATEGORY", "Event category does not exist or is inactive");
  }
};

const assertBankAccountBelongsToOwner = async (bankAccountId, ownerId) => {
  if (!bankAccountId) return;
  const account = await bankAccountsRepository.findById(bankAccountId);
  if (!account || account.owner_id !== ownerId) {
    throw badRequest("INVALID_BANK_ACCOUNT", "Bank account does not belong to this admin");
  }
};

/**
 * @param {string} ownerId
 * @param {object} input - see schemas/event-schemas.js `createEventSchema`
 */
export const createEvent = async (ownerId, input) => {
  await assertCategoryIsUsable(input.categoryId);
  await assertBankAccountBelongsToOwner(input.bankAccountId, ownerId);

  const slug = await generateUniqueSlug(input.name);
  return eventsRepository.create({ ...input, ownerId, slug });
};

/**
 * @param {string} eventId
 * @param {{ sub: string, role: string }} requester
 * @param {object} patch
 */
export const updateEvent = async (eventId, requester, patch) => {
  const event = await eventsRepository.findById(eventId);
  if (!event) throw notFound("EVENT_NOT_FOUND", "Event not found");
  assertEventOwnerOrSuperAdmin(event, requester);

  if (patch.categoryId) await assertCategoryIsUsable(patch.categoryId);
  if (patch.bankAccountId) await assertBankAccountBelongsToOwner(patch.bankAccountId, event.owner_id);

  return eventsRepository.update(eventId, patch);
};

/**
 * @param {string} eventId
 * @param {{ sub: string, role: string }} requester
 * @param {"draft" | "published" | "cancelled" | "completed"} nextStatus
 */
export const changeEventStatus = async (eventId, requester, nextStatus) => {
  const event = await eventsRepository.findById(eventId);
  if (!event) throw notFound("EVENT_NOT_FOUND", "Event not found");
  assertEventOwnerOrSuperAdmin(event, requester);

  if (!ALLOWED_STATUS_TRANSITIONS[event.status]?.includes(nextStatus)) {
    throw conflict("INVALID_STATUS_TRANSITION", `Cannot move an event from "${event.status}" to "${nextStatus}"`);
  }

  await eventsRepository.updateStatus(eventId, nextStatus);
  return eventsRepository.findById(eventId);
};

/**
 * @param {string} eventId
 * @param {{ sub: string, role: string }} requester
 * @param {boolean} isVisible
 */
export const setEventVisibility = async (eventId, requester, isVisible) => {
  const event = await eventsRepository.findById(eventId);
  if (!event) throw notFound("EVENT_NOT_FOUND", "Event not found");
  assertEventOwnerOrSuperAdmin(event, requester);

  await eventsRepository.updateVisibility(eventId, isVisible);
  return eventsRepository.findById(eventId);
};

/** @param {object} filters - see repositories/events-repository.js `list` */
export const listPublicEvents = (filters) => eventsRepository.list({ ...filters, publicOnly: true });

/** @param {string} ownerId */
export const listMyEvents = (ownerId, filters) => eventsRepository.list({ ...filters, ownerId });

/**
 * @param {string} slug
 * @param {{ sub: string, role: string } | null} requester - `null` for an unauthenticated visitor
 */
export const getEventBySlugForViewer = async (slug, requester) => {
  const event = await eventsRepository.findBySlug(slug);
  if (!event) throw notFound("EVENT_NOT_FOUND", "Event not found");

  const isPubliclyVisible = event.status === "published" && event.is_visible;
  const isOwnerOrSuperAdmin = requester && (requester.role === "super_admin" || requester.sub === event.owner_id);

  if (!isPubliclyVisible && !isOwnerOrSuperAdmin) {
    throw notFound("EVENT_NOT_FOUND", "Event not found");
  }

  return event;
};

/**
 * @param {string} eventId
 * @param {{ sub: string, role: string }} requester
 * @returns {Promise<object>} the event row, after asserting the requester owns it (or is super_admin)
 */
export const getOwnedEventOrThrow = async (eventId, requester) => {
  const event = await eventsRepository.findById(eventId);
  if (!event) throw notFound("EVENT_NOT_FOUND", "Event not found");
  assertEventOwnerOrSuperAdmin(event, requester);
  return event;
};
