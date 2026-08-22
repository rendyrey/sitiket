import * as eventStaffRepository from "../repositories/event-staff-repository.js";
import * as eventsRepository from "../repositories/events-repository.js";
import * as usersRepository from "../repositories/users-repository.js";
import { getOwnedEventOrThrow } from "./event-service.js";
import { conflict, notFound } from "../utils/http-error.js";
import { notifyGateStaffInvited } from "./notification-service.js";
import { pushNotification } from "./web-notification-service.js";

/**
 * Invites another Google-authenticated account as gate staff — see
 * docs/business/CHECKIN_GATE_SYSTEM.md §3. The invitee must have signed in
 * at least once already; there is no separate scanner credential system.
 * The invitation starts "pending" — scanning unlocks once they accept
 * (via {@link respond}). A declined invitation can be re-sent.
 * @param {string} eventId
 * @param {{ sub: string, role: string }} requester
 * @param {string} email
 */
export const invite = async (eventId, requester, email) => {
  const event = await getOwnedEventOrThrow(eventId, requester);

  const user = await usersRepository.findByEmail(email);
  if (!user) throw notFound("USER_NOT_FOUND", "That person must sign in with Google at least once before being invited");

  const existing = await eventStaffRepository.findByEventAndUser(eventId, user.id);
  if (existing && existing.status !== "declined") {
    throw conflict("ALREADY_STAFF", "This person is already invited as gate staff for this event");
  }

  const staff = existing
    ? await eventStaffRepository.updateStatus(existing.id, "pending")
    : await eventStaffRepository.create({ eventId, userId: user.id, invitedBy: requester.sub });

  // Invitation email (event details + accept/decline) plus a header-bell
  // notification — invitees are existing users by definition, so both land.
  const inviter = await usersRepository.findById(requester.sub);
  await notifyGateStaffInvited(user, event, inviter);
  await pushNotification({
    userId: user.id,
    type: "gate_staff_invited",
    title: "Gate staff invitation",
    body: `${inviter?.name ?? "An organizer"} invited you to scan tickets at ${event.name} — accept or decline.`,
    href: "/account/gate-staff",
  });

  return staff;
};

/**
 * The requester's own gate-staff invitations (any status), with event context.
 * @param {string} userId
 */
export const listMine = (userId) => eventStaffRepository.listByUser(userId);

/**
 * Accepts or declines a pending invitation — only the invitee may respond,
 * and only while it is still pending. The inviter gets a bell notification.
 * @param {string} staffId
 * @param {{ sub: string, role: string }} requester
 * @param {"accept" | "decline"} decision
 */
export const respond = async (staffId, requester, decision) => {
  const staff = await eventStaffRepository.findById(staffId);
  if (!staff || staff.user_id !== requester.sub) throw notFound("INVITATION_NOT_FOUND", "Invitation not found");
  if (staff.status !== "pending") throw conflict("ALREADY_RESPONDED", `This invitation is already "${staff.status}"`);

  const status = decision === "accept" ? "accepted" : "declined";
  const updated = await eventStaffRepository.updateStatus(staffId, status);

  const event = await eventsRepository.findById(staff.event_id);
  const responder = await usersRepository.findById(requester.sub);
  await pushNotification({
    userId: staff.invited_by,
    type: "gate_staff_response",
    title: decision === "accept" ? "Gate staff invitation accepted" : "Gate staff invitation declined",
    body: `${responder?.name ?? "The invitee"} ${status} your gate staff invitation for ${event?.name ?? "your event"}.`,
    href: event ? `/dashboard/admin/events/${event.slug}` : "/dashboard/admin",
  });

  return updated;
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
