import { db } from "../config/db.js";
import { newId } from "../utils/id.js";

const TABLE = "ticket_types";

/**
 * @param {string} eventId
 * @param {{ activeOnly?: boolean }} [options]
 */
export const listByEvent = (eventId, { activeOnly = false } = {}) => {
  const query = db(TABLE).where({ event_id: eventId }).orderBy("price", "asc");
  if (activeOnly) query.where({ is_active: true });
  return query;
};

/**
 * @param {string} id
 * @param {import("knex").Knex} [executor]
 */
export const findById = (id, executor = db) => executor(TABLE).where({ id }).first();

/**
 * @param {{ eventId: string, categoryId: string, name: string, price: number, quantityTotal: number, saleStartAt?: Date, saleEndAt?: Date }} input
 */
export const create = async (input) => {
  const id = newId();
  const now = new Date();
  await db(TABLE).insert({
    id,
    event_id: input.eventId,
    category_id: input.categoryId,
    name: input.name,
    price: input.price,
    quantity_total: input.quantityTotal,
    quantity_sold: 0,
    sale_start_at: input.saleStartAt ?? null,
    sale_end_at: input.saleEndAt ?? null,
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
    categoryId: "category_id",
    name: "name",
    price: "price",
    quantityTotal: "quantity_total",
    saleStartAt: "sale_start_at",
    saleEndAt: "sale_end_at",
    isActive: "is_active",
  };
  for (const [key, column] of Object.entries(fieldMap)) {
    if (patch[key] !== undefined) changes[column] = patch[key];
  }
  await db(TABLE).where({ id }).update(changes);
  return findById(id);
};

/**
 * Atomically reserves `quantity` units against remaining stock — the WHERE
 * clause re-checks `quantity_sold + quantity <= quantity_total` at the
 * database level so two concurrent buyers can never both win the last seat.
 * @param {string} id
 * @param {number} quantity
 * @param {import("knex").Knex} executor - must be an open transaction
 * @returns {Promise<boolean>} `true` if the reservation succeeded, `false` if there wasn't enough stock
 */
export const reserveInventory = async (id, quantity, executor) => {
  const affectedRows = await executor(TABLE)
    .where({ id })
    .andWhere(executor.raw("quantity_sold + ? <= quantity_total", [quantity]))
    .update({ quantity_sold: executor.raw("quantity_sold + ?", [quantity]) });
  return affectedRows > 0;
};

/**
 * Releases a previously reserved quantity (order expired/cancelled before payment).
 * @param {string} id
 * @param {number} quantity
 * @param {import("knex").Knex} [executor]
 */
export const releaseInventory = (id, quantity, executor = db) =>
  executor(TABLE)
    .where({ id })
    .update({ quantity_sold: executor.raw("GREATEST(quantity_sold - ?, 0)", [quantity]) });
