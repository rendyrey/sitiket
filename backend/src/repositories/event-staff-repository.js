import { db } from "../config/db.js";
import { newId } from "../utils/id.js";

const TABLE = "event_staff";

/** @param {string} eventId */
export const listByEvent = (eventId) =>
  db(TABLE)
    .where({ event_id: eventId })
    .join("users", "users.id", "event_staff.user_id")
    .select("event_staff.*", "users.name as user_name", "users.email as user_email");

/** @param {string} eventId @param {string} userId */
export const findByEventAndUser = (eventId, userId) => db(TABLE).where({ event_id: eventId, user_id: userId }).first();

/** @param {string} id */
export const findById = (id) => db(TABLE).where({ id }).first();

/** A user's own invitations (any status), newest first, with event + inviter context for the account page. */
export const listByUser = (userId) =>
  db(TABLE)
    .where({ user_id: userId })
    .join("events", "events.id", "event_staff.event_id")
    .leftJoin("users as inviters", "inviters.id", "event_staff.invited_by")
    .orderBy("event_staff.created_at", "desc")
    .select(
      "event_staff.*",
      "events.name as event_name",
      "events.slug as event_slug",
      "events.start_date as event_start_date",
      "events.venue_name as event_venue_name",
      "events.city as event_city",
      "inviters.name as inviter_name",
    );

/** @param {{ eventId: string, userId: string, invitedBy: string }} input */
export const create = async ({ eventId, userId, invitedBy }) => {
  const id = newId();
  await db(TABLE).insert({
    id,
    event_id: eventId,
    user_id: userId,
    role: "scanner",
    status: "pending",
    invited_by: invitedBy,
    created_at: new Date(),
  });
  return findById(id);
};

/** @param {string} id @param {"pending" | "accepted" | "declined"} status */
export const updateStatus = async (id, status) => {
  await db(TABLE).where({ id }).update({ status });
  return findById(id);
};

/** @param {string} id */
export const remove = (id) => db(TABLE).where({ id }).delete();
