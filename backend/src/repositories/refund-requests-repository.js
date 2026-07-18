import { db } from "../config/db.js";
import { newId } from "../utils/id.js";

const TABLE = "refund_requests";

/** @param {string} id */
export const findById = (id) => db(TABLE).where({ id }).first();

/** @param {string} orderId */
export const listByOrder = (orderId) => db(TABLE).where({ order_id: orderId }).orderBy("created_at", "desc");

/** @param {string} ownerId - lists refund requests across every event this admin owns */
export const listForEventOwner = (ownerId) =>
  db(TABLE)
    .join("orders", "orders.id", "refund_requests.order_id")
    .join("events", "events.id", "orders.event_id")
    .where("events.owner_id", ownerId)
    .select("refund_requests.*", "orders.event_id", "orders.total_amount")
    .orderBy("refund_requests.created_at", "desc");

/**
 * @param {{ orderId: string, requestedBy?: string, reason: string }} input
 */
export const create = async ({ orderId, requestedBy, reason }) => {
  const id = newId();
  const now = new Date();
  await db(TABLE).insert({
    id,
    order_id: orderId,
    requested_by: requestedBy ?? null,
    reason,
    status: "requested",
    created_at: now,
    updated_at: now,
  });
  return findById(id);
};

/**
 * @param {string} id
 * @param {{ status: "approved" | "rejected" | "completed", processedBy: string, notes?: string }} decision
 * @param {import("knex").Knex} [executor] - pass an open transaction to keep this atomic with related writes.
 */
export const decide = (id, { status, processedBy, notes }, executor = db) =>
  executor(TABLE).where({ id }).update({
    status,
    processed_by: processedBy,
    processed_at: new Date(),
    notes: notes ?? null,
    updated_at: new Date(),
  });
