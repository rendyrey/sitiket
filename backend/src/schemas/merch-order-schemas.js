import { z } from "zod";

export const createMerchOrderSchema = z.object({
  items: z
    .array(
      z.object({
        productId: z.string().uuid(),
        // Required when the product has variants — enforced in the service,
        // which knows the product.
        variantId: z.string().uuid().optional(),
        quantity: z.coerce.number().int().positive().max(100),
      }),
    )
    .min(1)
    .max(50),
  buyerNote: z.string().max(500).optional(),
});

/** `GET /api/merch-orders/selling` — the seller table's server-side search/filter/sort/pagination. */
export const listSellingOrdersQuerySchema = z.object({
  search: z.string().max(255).optional(),
  status: z.enum(["pending_payment", "awaiting_verification", "paid", "expired", "cancelled"]).optional(),
  sortBy: z.enum(["createdAt", "buyerName"]).optional(),
  sortDir: z.enum(["asc", "desc"]).optional(),
  page: z.coerce.number().int().positive().optional(),
  pageSize: z.coerce.number().int().positive().max(100).optional(),
});

export const submitMerchPaymentProofSchema = z.object({
  transferNote: z.string().max(500).optional(),
  // Which way the buyer paid. Defaults server-side to whichever method the
  // seller actually offers (bank transfer when available, else QRIS).
  method: z.enum(["bank_transfer", "qris"]).optional(),
});

export const decideMerchPaymentProofSchema = z.object({
  reviewerNotes: z.string().max(2000).optional(),
});
