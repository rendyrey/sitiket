import { z } from "zod";

/** Reused cart-items shape — identical to createMerchOrderSchema's `items`. */
const cartItemsSchema = z
  .array(
    z.object({
      productId: z.string().uuid(),
      variantId: z.string().uuid().optional(),
      quantity: z.coerce.number().int().positive().max(100),
    }),
  )
  .min(1)
  .max(50);

/** `POST /api/shipping/quotes` — courier options per seller for the buyer's cart. */
export const shippingQuoteSchema = z.object({
  items: cartItemsSchema,
});

/**
 * `PUT /api/shipping-origin` — the seller's departure address. Only the
 * village choice and street detail come from the client; the region
 * hierarchy is resolved server-side (services/regional-service.js).
 */
export const saveShippingOriginSchema = z.object({
  villageCode: z.string().regex(/^\d{10}$/, "villageCode must be a 10-digit api.co.id village code"),
  address: z.string().min(5).max(500),
  postalCode: z.string().max(20).optional(),
  // Courier whitelist — the codes the seller offers at checkout. Omitted or
  // null means "all couriers"; an empty array is rejected (a seller with no
  // courier could never be bought from).
  enabledCouriers: z.array(z.string().min(1).max(32)).min(1).max(50).nullish(),
});

/** Region path params — api.co.id codes are fixed-width digit strings. */
export const provinceCodeParamsSchema = z.object({ code: z.string().regex(/^\d{2}$/) });
export const regencyCodeParamsSchema = z.object({ code: z.string().regex(/^\d{4}$/) });
export const districtCodeParamsSchema = z.object({ code: z.string().regex(/^\d{6}$/) });
