import { db } from "../config/db.js";
import { newId } from "../utils/id.js";

const TABLE = "notifications";

/**
 * Latest notifications for the bell dropdown — capped, newest first.
 * @param {string} userId
 * @param {{ unreadOnly?: boolean, limit?: number }} [options]
 */
export const listByUser = (userId, { unreadOnly = false, limit = 20 } = {}) => {
  const query = db(TABLE).where({ user_id: userId }).orderBy("created_at", "desc").limit(limit);
  if (unreadOnly) query.whereNull("read_at");
  return query;
};

/** @param {string} userId @returns {Promise<number>} */
export const countUnread = async (userId) => {
  const [{ total }] = await db(TABLE).where({ user_id: userId }).whereNull("read_at").count({ total: "id" });
  return Number(total);
};

/** @param {{ userId: string, type: string, title: string, body: string, href?: string }} input */
export const create = async ({ userId, type, title, body, href }) => {
  const id = newId();
  await db(TABLE).insert({
    id,
    user_id: userId,
    type,
    title,
    body,
    href: href ?? null,
    read_at: null,
    created_at: new Date(),
  });
  return id;
};

/**
 * Marks the given notifications read — scoped to the user so one account can
 * never mark another's rows.
 * @param {string} userId
 * @param {string[]} ids
 */
export const markRead = (userId, ids) =>
  db(TABLE).where({ user_id: userId }).whereIn("id", ids).whereNull("read_at").update({ read_at: new Date() });

/** @param {string} userId */
export const markAllRead = (userId) =>
  db(TABLE).where({ user_id: userId }).whereNull("read_at").update({ read_at: new Date() });
