import * as promoCodeService from "../services/promo-code-service.js";

/** GET /api/events/:eventId/promo-codes — owner-only (never expose codes/limits to the public). */
export const list = async (request, response) => {
  const promoCodes = await promoCodeService.listForOwner(request.params.eventId, request.user);
  response.status(200).json({ data: promoCodes });
};

/** POST /api/events/:eventId/promo-codes */
export const create = async (request, response) => {
  const promoCode = await promoCodeService.create(request.params.eventId, request.user, request.body);
  response.status(201).json({ data: promoCode });
};

/** PATCH /api/events/:eventId/promo-codes/:promoCodeId */
export const update = async (request, response) => {
  const promoCode = await promoCodeService.update(
    request.params.eventId,
    request.user,
    request.params.promoCodeId,
    request.body,
  );
  response.status(200).json({ data: promoCode });
};
