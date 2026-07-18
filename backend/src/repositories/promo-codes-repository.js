import { db } from "../config/db.js";
import { newId } from "../utils/id.js";

const TABLE = "promo_codes";

/** @param {string} eventId */
export const listByEvent = (eventId) => db(TABLE).where({ event_id: eventId }).orderBy("created_at", "desc");

/**
 * @param {string} id
 * @param {import("knex").Knex} [executor]
 */
export const findById = (id, executor = db) => executor(TABLE).where({ id }).first();

/**
 * @param {string} eventId
 * @param {string} code
 * @param {import("knex").Knex} [executor]
 */
export const findByEventAndCode = (eventId, code, executor = db) =>
  executor(TABLE).where({ event_id: eventId, code }).first();

/**
 * @param {{ eventId: string, code: string, discountType: "percentage" | "fixed_amount", discountValue: number, maxUses: number, validFrom?: Date, validUntil?: Date }} input
 */
export const create = async (input) => {
  const id = newId();
  const now = new Date();
  await db(TABLE).insert({
    id,
    event_id: input.eventId,
    code: input.code,
    discount_type: input.discountType,
    discount_value: input.discountValue,
    max_uses: input.maxUses,
    used_count: 0,
    valid_from: input.validFrom ?? null,
    valid_until: input.validUntil ?? null,
    is_active: true,
    created_at: now,
    updated_at: now,
  });
  return findById(id);
};

/** @param {string} id @param {object} patch - camelCase fields */
export const update = async (id, patch) => {
  const changes = { updated_at: new Date() };
  const fieldMap = {
    discountType: "discount_type",
    discountValue: "discount_value",
    maxUses: "max_uses",
    validFrom: "valid_from",
    validUntil: "valid_until",
    isActive: "is_active",
  };
  for (const [key, column] of Object.entries(fieldMap)) {
    if (patch[key] !== undefined) changes[column] = patch[key];
  }
  await db(TABLE).where({ id }).update(changes);
  return findById(id);
};

/**
 * Atomically consumes one use — the WHERE clause re-checks
 * `used_count + 1 <= max_uses` so two concurrent redemptions can't both
 * succeed past the cap.
 * @param {string} id
 * @param {import("knex").Knex} executor - must be an open transaction
 * @returns {Promise<boolean>} `true` if the redemption succeeded
 */
export const incrementUsage = async (id, executor) => {
  const affectedRows = await executor(TABLE)
    .where({ id })
    .andWhere(executor.raw("used_count + 1 <= max_uses"))
    .update({ used_count: executor.raw("used_count + 1") });
  return affectedRows > 0;
};

/**
 * Releases a previously consumed use (order expired/cancelled before payment).
 * @param {string} id
 * @param {import("knex").Knex} [executor]
 */
export const decrementUsage = (id, executor = db) =>
  executor(TABLE)
    .where({ id })
    .update({ used_count: executor.raw("GREATEST(used_count - 1, 0)") });
