import { z } from "zod";

// Sales window: end must be strictly after start when both are given. A null
// (update only) clears that bound; an absent field leaves it unchanged.
const saleWindowIsOrdered = (data) =>
  !(data.saleStartAt && data.saleEndAt) || data.saleEndAt > data.saleStartAt;
const SALE_WINDOW_ERROR = { message: "Sales end must be after the sales start", path: ["saleEndAt"] };

export const createTicketTypeSchema = z
  .object({
    categoryId: z.string().uuid(),
    name: z.string().min(2).max(255),
    price: z.coerce.number().int().nonnegative(),
    quantityTotal: z.coerce.number().int().positive(),
    saleStartAt: z.coerce.date().optional(),
    saleEndAt: z.coerce.date().optional(),
  })
  .refine(saleWindowIsOrdered, SALE_WINDOW_ERROR);

export const updateTicketTypeSchema = z
  .object({
    categoryId: z.string().uuid(),
    name: z.string().min(2).max(255),
    price: z.coerce.number().int().nonnegative(),
    quantityTotal: z.coerce.number().int().positive(),
    // Nullable so an organizer can clear a previously-set sale bound.
    saleStartAt: z.coerce.date().nullable(),
    saleEndAt: z.coerce.date().nullable(),
    isActive: z.boolean(),
  })
  .partial()
  .refine((data) => Object.keys(data).length > 0, { message: "At least one field must be provided" })
  .refine(saleWindowIsOrdered, SALE_WINDOW_ERROR);
