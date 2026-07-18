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
