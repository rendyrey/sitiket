import { db } from "../config/db.js";
import { newId } from "../utils/id.js";

const TABLE = "order_payments";

/** @param {string} orderId */
export const listByOrder = (orderId) => db(TABLE).where({ order_id: orderId }).orderBy("submitted_at", "desc");

/** Most recent submission for an order — the authoritative one per docs/business/PAYMENT_VERIFICATION.md. */
export const findLatestByOrder = (orderId) =>
  db(TABLE).where({ order_id: orderId }).orderBy("submitted_at", "desc").first();

/** @param {string} id */
export const findById = (id) => db(TABLE).where({ id }).first();

/** Pending-review proofs on events owned by `ownerId` (joined with their order + event). */
const pendingReviewForOwner = (ownerId) =>
  db(TABLE)
    .join("orders", "orders.id", `${TABLE}.order_id`)
    .join("events", "events.id", "orders.event_id")
    .where(`${TABLE}.status`, "pending_review")
    .andWhere("events.owner_id", ownerId);

/**
 * An organizer's review queue across all their events, oldest first — the
 * Admin's "which payments need approval" view in the WhatsApp bot.
 * @param {string} ownerId - the admin's user id
 * @param {number} [limit]
 */
export const listPendingReviewForOwner = (ownerId, limit = 20) =>
  pendingReviewForOwner(ownerId)
    .select(`${TABLE}.*`, "orders.buyer_name", "orders.buyer_email", "events.name as event_name")
    .orderBy(`${TABLE}.submitted_at`, "asc")
    .limit(limit);

/**
 * One of that organizer's pending proofs by id prefix — resolves the 8-char
 * reference the WhatsApp bot shows in place of a full UUID. Capped at 2 rows:
 * the caller only needs to know whether the match is unique.
 * @param {string} prefix - lowercase hex. Example: `"a1b2c3d4"`
 * @param {string} ownerId - the admin's user id
 */
export const findPendingReviewByIdPrefixForOwner = (prefix, ownerId) =>
  pendingReviewForOwner(ownerId).select(`${TABLE}.id`).where(`${TABLE}.id`, "like", `${prefix}%`).limit(2);

/**
 * @param {{ orderId: string, method: "bank_transfer" | "qris", bankAccountId: string | null, amount: number, proofImageUrl: string, transferNote?: string }} input
 */
export const create = async (input) => {
  const id = newId();
  await db(TABLE).insert({
    id,
    order_id: input.orderId,
    method: input.method,
    bank_account_id: input.bankAccountId ?? null,
    amount: input.amount,
    proof_image_url: input.proofImageUrl,
    transfer_note: input.transferNote ?? null,
    status: "pending_review",
    submitted_at: new Date(),
  });
  return findById(id);
};

/**
 * @param {string} id
 * @param {{ status: "approved" | "rejected", reviewedBy: string, reviewerNotes?: string }} decision
 */
export const decide = (id, { status, reviewedBy, reviewerNotes }) =>
  db(TABLE).where({ id }).update({
    status,
    reviewed_by: reviewedBy,
    reviewed_at: new Date(),
    reviewer_notes: reviewerNotes ?? null,
  });
