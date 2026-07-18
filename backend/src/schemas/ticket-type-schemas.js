import { z } from "zod";

export const createTicketTypeSchema = z.object({
  categoryId: z.string().uuid(),
  name: z.string().min(2).max(255),
  price: z.coerce.number().int().nonnegative(),
  quantityTotal: z.coerce.number().int().positive(),
  saleStartAt: z.coerce.date().optional(),
  saleEndAt: z.coerce.date().optional(),
});

export const updateTicketTypeSchema = z
  .object({
    categoryId: z.string().uuid(),
    name: z.string().min(2).max(255),
    price: z.coerce.number().int().nonnegative(),
    quantityTotal: z.coerce.number().int().positive(),
    saleStartAt: z.coerce.date(),
    saleEndAt: z.coerce.date(),
    isActive: z.boolean(),
  })
  .partial()
  .refine((data) => Object.keys(data).length > 0, { message: "At least one field must be provided" });
