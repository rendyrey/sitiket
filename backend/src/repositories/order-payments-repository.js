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

/**
 * @param {{ orderId: string, bankAccountId: string, amount: number, proofImageUrl: string, transferNote?: string }} input
 */
export const create = async (input) => {
  const id = newId();
  await db(TABLE).insert({
    id,
    order_id: input.orderId,
    bank_account_id: input.bankAccountId,
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
