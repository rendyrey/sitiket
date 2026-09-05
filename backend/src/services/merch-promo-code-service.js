import * as merchPromoCodesRepository from "../repositories/merch-promo-codes-repository.js";
import { badRequest, conflict, forbidden, notFound } from "../utils/http-error.js";

/**
 * Loads a merch promo code and asserts the requester may manage it (its seller
 * or a super_admin) — reused by every promo-code mutation.
 * @param {string} promoCodeId
 * @param {{ sub: string, role: string }} requester
 */
const getOwnedPromoCodeOrThrow = async (promoCodeId, requester) => {
  const promoCode = await merchPromoCodesRepository.findById(promoCodeId);
  if (!promoCode) throw notFound("MERCH_PROMO_CODE_NOT_FOUND", "Promo code not found");
  if (requester.role !== "super_admin" && promoCode.seller_id !== requester.sub) {
    throw forbidden("NOT_MERCH_PROMO_OWNER", "Only the promo code owner or a super_admin can perform this action");
  }
  return promoCode;
};

/**
 * @param {{ sub: string, role: string }} requester - the seller creating the code
 * @param {{ code: string, discountType: string, discountValue: number, maxUses: number, validFrom?: Date, validUntil?: Date }} input
 */
export const create = async (requester, input) => {
  try {
    return await merchPromoCodesRepository.create({ ...input, sellerId: requester.sub });
  } catch (error) {
    if (error?.code === "ER_DUP_ENTRY") {
      throw conflict("MERCH_PROMO_CODE_TAKEN", `Code "${input.code}" already exists in your store`);
    }
    throw error;
  }
};

/** @param {{ sub: string }} requester */
export const listForOwner = (requester) => merchPromoCodesRepository.listBySeller(requester.sub);

/**
 * @param {{ sub: string, role: string }} requester
 * @param {string} promoCodeId
 * @param {object} patch
 */
export const update = async (requester, promoCodeId, patch) => {
  await getOwnedPromoCodeOrThrow(promoCodeId, requester);
  return merchPromoCodesRepository.update(promoCodeId, patch);
};

/**
 * Pure discount calculation, clamped so a discount can never exceed the seller
 * subtotal. Mirrors promo-code-service.js `calculateDiscount` (kept local so
 * the merch domain stays self-contained).
 * @param {{ discount_type: "percentage" | "fixed_amount", discount_value: string | number }} promoCode - a `merch_promo_codes` row
 * @param {number} subtotalAmount - whole-Rupiah integer
 * @returns {number} whole-Rupiah discount amount
 */
export const calculateDiscount = (promoCode, subtotalAmount) => {
  const value = Number(promoCode.discount_value);
  const raw = promoCode.discount_type === "percentage" ? Math.round((subtotalAmount * value) / 100) : Math.round(value);
  return Math.min(raw, subtotalAmount);
};

/**
 * Validates a promo code is currently redeemable for a seller, without yet
 * consuming a use (the atomic consume happens inside the order-creation
 * transaction via `merchPromoCodesRepository.incrementUsage`).
 * @param {string} sellerId
 * @param {string} code
 * @returns {Promise<object>} the `merch_promo_codes` row
 */
export const validateForOrder = async (sellerId, code) => {
  const promoCode = await merchPromoCodesRepository.findBySellerAndCode(sellerId, code);
  if (!promoCode || !promoCode.is_active) {
    throw badRequest("MERCH_PROMO_CODE_INVALID", "Promo code does not exist or is inactive");
  }

  const now = new Date();
  if (promoCode.valid_from && now < new Date(promoCode.valid_from)) {
    throw badRequest("MERCH_PROMO_CODE_NOT_YET_VALID", "Promo code is not active yet");
  }
  if (promoCode.valid_until && now > new Date(promoCode.valid_until)) {
    throw badRequest("MERCH_PROMO_CODE_EXPIRED", "Promo code has expired");
  }
  if (promoCode.used_count >= promoCode.max_uses) {
    throw badRequest("MERCH_PROMO_CODE_EXHAUSTED", "Promo code has reached its usage limit");
  }

  return promoCode;
};

/**
 * Buyer-facing preview: validates a code for a seller and returns just enough
 * to price the discount in the checkout UI. The authoritative discount is
 * recomputed (and the use consumed) at order creation.
 * @param {string} sellerId
 * @param {string} code
 */
export const validatePreview = async (sellerId, code) => {
  const promoCode = await validateForOrder(sellerId, code);
  return {
    code: promoCode.code,
    discount_type: promoCode.discount_type,
    discount_value: promoCode.discount_value,
  };
};
