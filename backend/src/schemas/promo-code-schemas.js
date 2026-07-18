import { z } from "zod";

export const createPromoCodeSchema = z
  .object({
    code: z
      .string()
      .min(3)
      .max(64)
      .transform((value) => value.toUpperCase()),
    discountType: z.enum(["percentage", "fixed_amount"]),
    discountValue: z.coerce.number().positive(),
    maxUses: z.coerce.number().int().positive(),
    validFrom: z.coerce.date().optional(),
    validUntil: z.coerce.date().optional(),
  })
  .refine((data) => data.discountType !== "percentage" || data.discountValue <= 100, {
    message: "A percentage discount cannot exceed 100",
    path: ["discountValue"],
  });

export const updatePromoCodeSchema = z
  .object({
    discountType: z.enum(["percentage", "fixed_amount"]),
    discountValue: z.coerce.number().positive(),
    maxUses: z.coerce.number().int().positive(),
    validFrom: z.coerce.date(),
    validUntil: z.coerce.date(),
    isActive: z.boolean(),
  })
  .partial()
  .refine((data) => Object.keys(data).length > 0, { message: "At least one field must be provided" });
