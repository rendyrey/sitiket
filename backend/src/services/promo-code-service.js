import * as promoCodesRepository from "../repositories/promo-codes-repository.js";
import { getOwnedEventOrThrow } from "./event-service.js";
import { badRequest, conflict } from "../utils/http-error.js";

/**
 * @param {{ eventId: string, requester: {sub:string, role:string} }} owner
 * @param {{ code: string, discountType: string, discountValue: number, maxUses: number, validFrom?: Date, validUntil?: Date }} input
 */
export const create = async (eventId, requester, input) => {
  await getOwnedEventOrThrow(eventId, requester);

  try {
    return await promoCodesRepository.create({ ...input, eventId });
  } catch (error) {
    if (error?.code === "ER_DUP_ENTRY") throw conflict("PROMO_CODE_TAKEN", `Code "${input.code}" already exists for this event`);
    throw error;
  }
};

/**
 * @param {string} eventId
 * @param {{ sub: string, role: string }} requester
 */
export const listForOwner = async (eventId, requester) => {
  await getOwnedEventOrThrow(eventId, requester);
  return promoCodesRepository.listByEvent(eventId);
};

/**
 * @param {string} eventId
 * @param {{ sub: string, role: string }} requester
 * @param {string} promoCodeId
 * @param {object} patch
 */
export const update = async (eventId, requester, promoCodeId, patch) => {
  await getOwnedEventOrThrow(eventId, requester);
  return promoCodesRepository.update(promoCodeId, patch);
};

/**
 * Pure discount calculation, clamped so a discount can never exceed the
 * order subtotal (e.g. a stacked/misconfigured fixed-amount code).
 * @param {{ discount_type: "percentage" | "fixed_amount", discount_value: string | number }} promoCode - a `promo_codes` row
 * @param {number} subtotalAmount - whole-Rupiah integer
 * @returns {number} whole-Rupiah discount amount
 */
export const calculateDiscount = (promoCode, subtotalAmount) => {
  const value = Number(promoCode.discount_value);
  const raw = promoCode.discount_type === "percentage" ? Math.round((subtotalAmount * value) / 100) : Math.round(value);
  return Math.min(raw, subtotalAmount);
};

/**
 * Validates a promo code is currently redeemable for an event, without yet
 * consuming a use (the atomic consume happens inside the order-creation
 * transaction via `promoCodesRepository.incrementUsage`).
 * @param {string} eventId
 * @param {string} code
 * @returns {Promise<object>} the `promo_codes` row
 */
export const validateForOrder = async (eventId, code) => {
  const promoCode = await promoCodesRepository.findByEventAndCode(eventId, code);
  if (!promoCode || !promoCode.is_active) {
    throw badRequest("PROMO_CODE_INVALID", "Promo code does not exist or is inactive");
  }

  const now = new Date();
  if (promoCode.valid_from && now < new Date(promoCode.valid_from)) {
    throw badRequest("PROMO_CODE_NOT_YET_VALID", "Promo code is not active yet");
  }
  if (promoCode.valid_until && now > new Date(promoCode.valid_until)) {
    throw badRequest("PROMO_CODE_EXPIRED", "Promo code has expired");
  }
  if (promoCode.used_count >= promoCode.max_uses) {
    throw badRequest("PROMO_CODE_EXHAUSTED", "Promo code has reached its usage limit");
  }

  return promoCode;
};
