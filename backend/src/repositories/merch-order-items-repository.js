import { db } from "../config/db.js";
import { newId } from "../utils/id.js";

const TABLE = "merch_order_items";

/** @param {string} merchOrderId */
export const listByOrder = (merchOrderId) => db(TABLE).where({ merch_order_id: merchOrderId });

/** @param {string[]} merchOrderIds */
export const listByOrders = (merchOrderIds) =>
  merchOrderIds.length ? db(TABLE).whereIn("merch_order_id", merchOrderIds) : Promise.resolve([]);

/**
 * @param {Array<{ productId: string, variantId: string | null, productName: string, variantLabel: string | null, quantity: number, unitPrice: number }>} items
 * @param {string} merchOrderId
 * @param {import("knex").Knex} executor - must be an open transaction
 */
export const createMany = async (items, merchOrderId, executor) => {
  const now = new Date();
  const rows = items.map((item) => ({
    id: newId(),
    merch_order_id: merchOrderId,
    product_id: item.productId,
    variant_id: item.variantId ?? null,
    product_name: item.productName,
    variant_label: item.variantLabel ?? null,
    quantity: item.quantity,
    unit_price: item.unitPrice,
    subtotal: item.unitPrice * item.quantity,
    created_at: now,
  }));

  await executor(TABLE).insert(rows);
  return rows.map((row) => row.id);
};
