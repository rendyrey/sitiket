import { db } from "../config/db.js";
import { newId } from "../utils/id.js";

const TABLE = "tickets";

const withOrderContext = (query) =>
  query
    .join("order_items", "order_items.id", "tickets.order_item_id")
    .join("orders", "orders.id", "order_items.order_id")
    .join("ticket_types", "ticket_types.id", "order_items.ticket_type_id")
    .select(
      "tickets.*",
      "order_items.order_id",
      "order_items.ticket_type_id",
      "orders.event_id",
      "orders.buyer_name",
      "orders.buyer_email",
      "ticket_types.name as ticket_type_name",
    );

/**
 * @param {string} ticketCode
 * @param {import("knex").Knex} [executor]
 */
export const findByCodeWithContext = (ticketCode, executor = db) =>
  withOrderContext(executor(TABLE)).where("tickets.ticket_code", ticketCode).first();

/** @param {string} id */
export const findById = (id) => db(TABLE).where({ id }).first();

/** @param {string} orderId */
export const listByOrderWithContext = (orderId) => withOrderContext(db(TABLE)).where("orders.id", orderId);

/** @param {string} userId */
export const listByUserWithContext = (userId) =>
  withOrderContext(db(TABLE)).where("orders.user_id", userId).orderBy("tickets.created_at", "desc");

/**
 * @param {Array<{ orderItemId: string, ticketCode: string, qrPayload: string }>} rows
 * @param {import("knex").Knex} executor
 */
export const createMany = async (rows, executor) => {
  const now = new Date();
  await executor(TABLE).insert(
    rows.map((row) => ({
      id: newId(),
      order_item_id: row.orderItemId,
      ticket_code: row.ticketCode,
      qr_payload: row.qrPayload,
      status: "issued",
      created_at: now,
    })),
  );
};

/**
 * Atomically transitions a ticket from `issued` to `used` — the WHERE
 * clause re-checks `status = 'issued'` so two concurrent scans of the same
 * ticket can never both succeed.
 * @param {string} id
 * @param {string} checkedInBy
 * @param {import("knex").Knex} [executor]
 * @returns {Promise<boolean>} `true` if this scan won the race
 */
export const markUsedIfIssued = async (id, checkedInBy, executor = db) => {
  const affectedRows = await executor(TABLE)
    .where({ id, status: "issued" })
    .update({ status: "used", checked_in_at: new Date(), checked_in_by: checkedInBy });
  return affectedRows > 0;
};

/** @param {string} id */
export const markVoid = (id) => db(TABLE).where({ id }).update({ status: "void" });

/**
 * Voids every still-`issued` ticket for an order (a refund blocks further
 * gate entry; a ticket already `used` before the refund stays as-is — you
 * can't un-admit someone already inside).
 * @param {string} orderId
 * @param {import("knex").Knex} [executor]
 */
export const voidIssuedTicketsForOrder = (orderId, executor = db) =>
  executor(TABLE)
    .whereIn("order_item_id", executor("order_items").select("id").where({ order_id: orderId }))
    .andWhere({ status: "issued" })
    .update({ status: "void" });
