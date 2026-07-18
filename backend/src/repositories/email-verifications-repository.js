import { db } from "../config/db.js";
import { newId } from "../utils/id.js";

const TABLE = "email_verifications";

/**
 * @param {{ email: string, purpose: "guest_checkout" | "account", orderId?: string, userId?: string, code: string, expiresAt: Date }} input
 */
export const create = async (input) => {
  const id = newId();
  await db(TABLE).insert({
    id,
    email: input.email,
    purpose: input.purpose,
    order_id: input.orderId ?? null,
    user_id: input.userId ?? null,
    code: input.code,
    expires_at: input.expiresAt,
    created_at: new Date(),
  });
  return db(TABLE).where({ id }).first();
};

/** Most recent unverified, unexpired OTP for an order's guest-checkout verification. */
export const findLatestPendingForOrder = (orderId) =>
  db(TABLE)
    .where({ order_id: orderId, purpose: "guest_checkout" })
    .whereNull("verified_at")
    .andWhere("expires_at", ">", new Date())
    .orderBy("created_at", "desc")
    .first();

/** @param {string} id */
export const markVerified = (id) => db(TABLE).where({ id }).update({ verified_at: new Date() });
