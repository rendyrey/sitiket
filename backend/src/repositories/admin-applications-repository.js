import { db } from "../config/db.js";
import { newId } from "../utils/id.js";

const TABLE = "admin_applications";

/**
 * @param {string} id
 * @param {import("knex").Knex} [executor] - pass an open transaction to read inside it; defaults to the pool.
 */
export const findById = (id, executor = db) => executor(TABLE).where({ id }).first();

/** @param {string} userId */
export const findPendingByUserId = (userId) => db(TABLE).where({ user_id: userId, status: "pending" }).first();

/**
 * @param {{ userId: string, businessName: string, businessDescription?: string, contactPhone: string }} input
 * @returns {Promise<object>} the created application row
 */
export const create = async ({ userId, businessName, businessDescription, contactPhone }) => {
  const id = newId();
  await db(TABLE).insert({
    id,
    user_id: userId,
    business_name: businessName,
    business_description: businessDescription ?? null,
    contact_phone: contactPhone,
    status: "pending",
    created_at: new Date(),
  });
  return findById(id);
};

/** @param {{ status?: "pending" | "approved" | "rejected", page?: number, pageSize?: number }} filters */
export const list = async ({ status, page = 1, pageSize = 20 } = {}) => {
  const query = db(TABLE);
  if (status) query.where({ status });

  const [{ total }] = await query.clone().count({ total: "*" });
  const rows = await query
    .clone()
    .orderBy("created_at", "desc")
    .limit(pageSize)
    .offset((page - 1) * pageSize);

  return { rows, total: Number(total), page, pageSize };
};

/**
 * @param {string} id
 * @param {{ status: "approved" | "rejected", reviewedBy: string, reviewNotes?: string }} decision
 * @param {import("knex").Knex} [executor] - pass an open transaction to keep this atomic with the related role update.
 */
export const decide = (id, { status, reviewedBy, reviewNotes }, executor = db) =>
  executor(TABLE).where({ id }).update({
    status,
    reviewed_by: reviewedBy,
    reviewed_at: new Date(),
    review_notes: reviewNotes ?? null,
  });
