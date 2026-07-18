import { db } from "../config/db.js";
import { newId } from "../utils/id.js";

const TABLE = "orders";

/**
 * @param {string} id
 * @param {import("knex").Knex} [executor]
 */
export const findById = (id, executor = db) => executor(TABLE).where({ id }).first();

/** @param {string} userId */
export const listByUser = (userId) => db(TABLE).where({ user_id: userId }).orderBy("created_at", "desc");

const SORT_COLUMNS = { createdAt: "created_at", buyerName: "buyer_name" };

/**
 * Paginated, filterable listing for the admin orders table — keeps a
 * thousands-of-orders event from ever loading its full order list into the
 * browser (search/status/sort all run in SQL).
 * @param {string} eventId
 * @param {object} [filters]
 * @param {string} [filters.search] - matches buyer name or email
 * @param {string} [filters.status]
 * @param {"createdAt" | "buyerName"} [filters.sortBy]
 * @param {"asc" | "desc"} [filters.sortDir]
 * @param {number} [filters.page]
 * @param {number} [filters.pageSize]
 */
export const listByEvent = async (
  eventId,
  { search, status, sortBy = "createdAt", sortDir = "desc", page = 1, pageSize = 20 } = {},
) => {
  const applyFilters = (query) => {
    query.where("event_id", eventId);
    if (status) query.andWhere("status", status);
    if (search) {
      query.andWhere((builder) => {
        builder.whereILike("buyer_name", `%${search}%`).orWhereILike("buyer_email", `%${search}%`);
      });
    }
    return query;
  };

  const [{ total }] = await applyFilters(db(TABLE)).count({ total: "id" });

  const rows = await applyFilters(db(TABLE))
    .orderBy(SORT_COLUMNS[sortBy] ?? "created_at", sortDir)
    .limit(pageSize)
    .offset((page - 1) * pageSize);

  return { rows, total: Number(total), page, pageSize };
};

/**
 * Sums ticket quantities a buyer already holds for an event across orders
 * that still count against the per-event limit (i.e. not cancelled/expired/
 * rejected-refund-only orders are excluded — a refunded order still counted
 * the tickets it consumed while active, so only dead orders are excluded).
 * @param {string} eventId
 * @param {{ userId?: string, buyerEmail?: string }} identity
 * @param {import("knex").Knex} [executor]
 * @returns {Promise<number>}
 */
export const sumActiveTicketQuantityForBuyer = async (eventId, { userId, buyerEmail }, executor = db) => {
  const query = executor(TABLE)
    .join("order_items", "order_items.order_id", "orders.id")
    .where("orders.event_id", eventId)
    .whereNotIn("orders.status", ["cancelled", "expired"]);

  if (userId) query.andWhere("orders.user_id", userId);
  else query.andWhere("orders.buyer_email", buyerEmail);

  const [{ total }] = await query.sum({ total: "order_items.quantity" });
  return Number(total) || 0;
};

/**
 * @param {object} input - camelCase order fields
 * @param {import("knex").Knex} executor - must be an open transaction (inventory was just reserved in it)
 * @returns {Promise<string>} the created order's id
 */
export const create = async (input, executor) => {
  const id = newId();
  const now = new Date();
  await executor(TABLE).insert({
    id,
    event_id: input.eventId,
    user_id: input.userId ?? null,
    buyer_name: input.buyerName,
    buyer_email: input.buyerEmail,
    buyer_phone: input.buyerPhone,
    guest_email_verified_at: null,
    promo_code_id: input.promoCodeId ?? null,
    subtotal_amount: input.subtotalAmount,
    discount_amount: input.discountAmount,
    total_amount: input.totalAmount,
    status: "pending_payment",
    payment_expires_at: input.paymentExpiresAt,
    created_at: now,
    updated_at: now,
  });
  return id;
};

/**
 * @param {string} id
 * @param {"pending_payment" | "awaiting_verification" | "paid" | "expired" | "cancelled" | "refund_requested" | "refunded" | "refund_rejected"} status
 * @param {import("knex").Knex} [executor]
 */
export const updateStatus = (id, status, executor = db) =>
  executor(TABLE).where({ id }).update({ status, updated_at: new Date() });

/**
 * @param {string} id
 * @param {import("knex").Knex} [executor]
 */
export const markGuestEmailVerified = (id, executor = db) =>
  executor(TABLE).where({ id }).update({ guest_email_verified_at: new Date(), updated_at: new Date() });

/** Orders past their payment hold that never got a proof submitted. */
export const findExpiredPendingOrders = (executor = db) =>
  executor(TABLE).where({ status: "pending_payment" }).andWhere("payment_expires_at", "<", new Date());
