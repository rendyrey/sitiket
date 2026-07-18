import { z } from "zod";

const slugSchema = z
  .string()
  .min(2)
  .max(120)
  .regex(/^[a-z0-9]+(-[a-z0-9]+)*$/, "slug must be lowercase kebab-case, e.g. \"live-music\"");

export const createTaxonomySchema = z.object({
  name: z.string().min(2).max(100),
  slug: slugSchema,
  sortOrder: z.coerce.number().int().nonnegative().optional(),
});

export const updateTaxonomySchema = z
  .object({
    name: z.string().min(2).max(100),
    slug: slugSchema,
    sortOrder: z.coerce.number().int().nonnegative(),
    isActive: z.boolean(),
  })
  .partial()
  .refine((data) => Object.keys(data).length > 0, { message: "At least one field must be provided" });

export const listTaxonomyQuerySchema = z.object({
  includeInactive: z
    .enum(["true", "false"])
    .optional()
    .transform((value) => value === "true"),
});
