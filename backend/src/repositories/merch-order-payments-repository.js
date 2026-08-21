import { db } from "../config/db.js";
import { newId } from "../utils/id.js";

const TABLE = "merch_order_payments";

/** @param {string} merchOrderId */
export const listByOrder = (merchOrderId) =>
  db(TABLE).where({ merch_order_id: merchOrderId }).orderBy("submitted_at", "desc");

/** @param {string} id */
export const findById = (id) => db(TABLE).where({ id }).first();

/**
 * @param {{ merchOrderId: string, method: "bank_transfer" | "qris", bankAccountId: string | null, amount: number, proofImageUrl: string, transferNote?: string }} input
 */
export const create = async (input) => {
  const id = newId();
  await db(TABLE).insert({
    id,
    merch_order_id: input.merchOrderId,
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
