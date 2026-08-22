import * as sellerShippingOriginService from "../services/seller-shipping-origin-service.js";
import * as shippingService from "../services/shipping-service.js";

/** POST /api/shipping/quotes — per-seller courier options for the signed-in buyer's cart. */
export const quote = async (request, response) => {
  const quotes = await shippingService.quoteCart(request.user, request.body.items);
  response.status(200).json({ data: quotes });
};

/** GET /api/shipping/couriers — the known courier catalog (for the seller's enable/disable checkboxes). */
export const listCouriers = async (_request, response) => {
  response.status(200).json({ data: shippingService.KNOWN_COURIERS });
};

/** GET /api/shipping-origin — the current admin's own departure address, or null. */
export const getMyOrigin = async (request, response) => {
  const origin = await sellerShippingOriginService.getMine(request.user.sub);
  response.status(200).json({ data: origin });
};

/** PUT /api/shipping-origin — create or replace the departure address. */
export const saveMyOrigin = async (request, response) => {
  const origin = await sellerShippingOriginService.save(request.user.sub, request.body);
  response.status(200).json({ data: origin });
};
