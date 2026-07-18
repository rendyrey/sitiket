import { db } from "../config/db.js";
import { newId } from "../utils/id.js";

const TABLE = "order_items";

/** @param {string} orderId */
export const listByOrder = (orderId) => db(TABLE).where({ order_id: orderId });

/**
 * @param {Array<{ ticketTypeId: string, quantity: number, unitPrice: number }>} items
 * @param {string} orderId
 * @param {import("knex").Knex} executor - must be an open transaction
 * @returns {Promise<string[]>} the created order_items' ids, in the same order as `items`
 */
export const createMany = async (items, orderId, executor) => {
  const now = new Date();
  const rows = items.map((item) => ({
    id: newId(),
    order_id: orderId,
    ticket_type_id: item.ticketTypeId,
    quantity: item.quantity,
    unit_price: item.unitPrice,
    subtotal: item.unitPrice * item.quantity,
    created_at: now,
  }));

  await executor(TABLE).insert(rows);
  return rows.map((row) => row.id);
};
