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

/** @param {{ eventId: string, userId: string, invitedBy: string }} input */
export const create = async ({ eventId, userId, invitedBy }) => {
  const id = newId();
  await db(TABLE).insert({
    id,
    event_id: eventId,
    user_id: userId,
    role: "scanner",
    invited_by: invitedBy,
    created_at: new Date(),
  });
  return findById(id);
};

/** @param {string} id */
export const remove = (id) => db(TABLE).where({ id }).delete();
