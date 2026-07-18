import { z } from "zod";

export const createOrderSchema = z.object({
  eventId: z.string().uuid(),
  items: z
    .array(
      z.object({
        ticketTypeId: z.string().uuid(),
        quantity: z.coerce.number().int().positive().max(100),
      }),
    )
    .min(1),
  promoCode: z.string().min(1).max(64).optional(),
  buyerName: z.string().min(2).max(255),
  buyerEmail: z.string().email(),
  buyerPhone: z.string().min(6).max(32),
});

export const verifyGuestOtpSchema = z.object({
  code: z.string().length(6),
});

export const guestOrderLookupQuerySchema = z.object({
  email: z.string().email(),
});

/** `GET /api/events/:eventId/orders` — server-side search/filter/sort/pagination so the admin orders table never loads the full list into the browser. */
export const listEventOrdersQuerySchema = z.object({
  search: z.string().max(255).optional(),
  status: z
    .enum([
      "pending_payment",
      "awaiting_verification",
      "paid",
      "expired",
      "cancelled",
      "refund_requested",
      "refunded",
      "refund_rejected",
    ])
    .optional(),
  sortBy: z.enum(["createdAt", "buyerName"]).optional(),
  sortDir: z.enum(["asc", "desc"]).optional(),
  page: z.coerce.number().int().positive().optional(),
  pageSize: z.coerce.number().int().positive().max(100).optional(),
});
