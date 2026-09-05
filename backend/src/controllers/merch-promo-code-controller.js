import * as merchPromoCodeService from "../services/merch-promo-code-service.js";

/** GET /api/merch-promo-codes — the seller's own codes (never exposed to the public). */
export const list = async (request, response) => {
  const promoCodes = await merchPromoCodeService.listForOwner(request.user);
  response.status(200).json({ data: promoCodes });
};

/** POST /api/merch-promo-codes */
export const create = async (request, response) => {
  const promoCode = await merchPromoCodeService.create(request.user, request.body);
  response.status(201).json({ data: promoCode });
};

/** PATCH /api/merch-promo-codes/:id */
export const update = async (request, response) => {
  const promoCode = await merchPromoCodeService.update(request.user, request.params.id, request.body);
  response.status(200).json({ data: promoCode });
};

/** POST /api/merch-promo-codes/validate — buyer-facing checkout preview. */
export const validate = async (request, response) => {
  const preview = await merchPromoCodeService.validatePreview(request.body.sellerId, request.body.code);
  response.status(200).json({ data: preview });
};
