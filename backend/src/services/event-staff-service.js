import * as eventStaffRepository from "../repositories/event-staff-repository.js";
import * as usersRepository from "../repositories/users-repository.js";
import { getOwnedEventOrThrow } from "./event-service.js";
import { conflict, notFound } from "../utils/http-error.js";

/**
 * Delegates gate-scanning access to another Google-authenticated account —
 * see docs/business/CHECKIN_GATE_SYSTEM.md §3. The invitee must have signed
 * in at least once already; there is no separate scanner credential system.
 * @param {string} eventId
 * @param {{ sub: string, role: string }} requester
 * @param {string} email
 */
export const invite = async (eventId, requester, email) => {
  await getOwnedEventOrThrow(eventId, requester);

  const user = await usersRepository.findByEmail(email);
  if (!user) throw notFound("USER_NOT_FOUND", "That person must sign in with Google at least once before being invited");

  const existing = await eventStaffRepository.findByEventAndUser(eventId, user.id);
  if (existing) throw conflict("ALREADY_STAFF", "This person is already gate staff for this event");

  return eventStaffRepository.create({ eventId, userId: user.id, invitedBy: requester.sub });
};

/**
 * @param {string} eventId
 * @param {{ sub: string, role: string }} requester
 */
export const list = async (eventId, requester) => {
  await getOwnedEventOrThrow(eventId, requester);
  return eventStaffRepository.listByEvent(eventId);
};

/**
 * @param {string} eventId
 * @param {{ sub: string, role: string }} requester
 * @param {string} staffId
 */
export const remove = async (eventId, requester, staffId) => {
  await getOwnedEventOrThrow(eventId, requester);

  const staff = await eventStaffRepository.findById(staffId);
  if (!staff || staff.event_id !== eventId) throw notFound("STAFF_NOT_FOUND", "Event staff member not found");

  await eventStaffRepository.remove(staffId);
};
