import { db } from "../config/db.js";
import { newId } from "../utils/id.js";

const TABLE = "merch_orders";

/**
 * @param {string} id
 * @param {import("knex").Knex} [executor]
 */
export const findById = (id, executor = db) => executor(TABLE).where({ id }).first();

/** @param {string} userId - the buyer */
export const listByBuyer = (userId) => db(TABLE).where({ user_id: userId }).orderBy("created_at", "desc");

const SORT_COLUMNS = { createdAt: "created_at", buyerName: "buyer_name" };

/**
 * Paginated, filterable listing for the seller's merch-orders table —
 * search/status/sort run in SQL, mirroring orders-repository.js `listByEvent`.
 * @param {string} sellerId
 * @param {object} [filters]
 * @param {string} [filters.search] - matches buyer name or email
 * @param {string} [filters.status]
 * @param {"createdAt" | "buyerName"} [filters.sortBy]
 * @param {"asc" | "desc"} [filters.sortDir]
 * @param {number} [filters.page]
 * @param {number} [filters.pageSize]
 */
export const listBySeller = async (
  sellerId,
  { search, status, sortBy = "createdAt", sortDir = "desc", page = 1, pageSize = 20 } = {},
) => {
  const applyFilters = (query) => {
    query.where("seller_id", sellerId);
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
 * @param {object} input - camelCase merch order fields
 * @param {import("knex").Knex} executor - must be an open transaction (stock was just reserved in it)
 * @returns {Promise<string>} the created order's id
 */
export const create = async (input, executor) => {
  const id = newId();
  const now = new Date();
  await executor(TABLE).insert({
    id,
    seller_id: input.sellerId,
    user_id: input.userId,
    buyer_name: input.buyerName,
    buyer_email: input.buyerEmail,
    buyer_phone: input.buyerPhone,
    shipping_address: input.shippingAddress,
    shipping_city: input.shippingCity ?? null,
    shipping_province: input.shippingProvince ?? null,
    shipping_postal_code: input.shippingPostalCode ?? null,
    shipping_district: input.shippingDistrict ?? null,
    shipping_village: input.shippingVillage ?? null,
    shipping_village_code: input.shippingVillageCode ?? null,
    origin_village_code: input.originVillageCode ?? null,
    courier_code: input.courierCode ?? null,
    courier_name: input.courierName ?? null,
    shipping_estimation: input.shippingEstimation ?? null,
    shipping_cost: input.shippingCost ?? 0,
    shipping_weight_grams: input.shippingWeightGrams ?? null,
    buyer_note: input.buyerNote ?? null,
    promo_code_id: input.promoCodeId ?? null,
    subtotal_amount: input.subtotalAmount,
    discount_amount: input.discountAmount ?? 0,
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
 * @param {"pending_payment" | "awaiting_verification" | "paid" | "expired" | "cancelled"} status
 * @param {import("knex").Knex} [executor]
 */
export const updateStatus = (id, status, executor = db) =>
  executor(TABLE).where({ id }).update({ status, updated_at: new Date() });

/** Merch orders past their payment hold that never got a proof submitted. */
export const findExpiredPendingOrders = (executor = db) =>
  executor(TABLE).where({ status: "pending_payment" }).andWhere("payment_expires_at", "<", new Date());
