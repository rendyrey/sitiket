import { z } from "zod";

const baseFields = {
  categoryId: z.string().uuid(),
  name: z.string().min(2).max(255),
  description: z.string().min(1),
  // Whole-Rupiah integers, like every money column in this codebase.
  price: z.coerce.number().int().nonnegative().max(1_000_000_000),
  // Base stock — ignored for selling once the product has variants.
  stock: z.coerce.number().int().nonnegative().max(1_000_000),
  // Package weight in grams — shipping quotes bill per started kg (min 1kg).
  weightGrams: z.coerce.number().int().positive().max(500_000).default(1000),
};

export const createProductSchema = z.object(baseFields);

export const updateProductSchema = z
  .object(baseFields)
  .partial()
  .refine((data) => Object.keys(data).length > 0, { message: "At least one field must be provided" });

export const setProductActiveSchema = z.object({
  isActive: z.boolean(),
});

/**
 * The whole option/variant matrix, replaced atomically —
 * `variants[].options[i]` is the chosen value from `groups[i]`.
 * Cross-field rules (values exist, combos unique, every group covered) live
 * in services/product-service.js `replaceVariantConfig`.
 */
export const replaceVariantsSchema = z.object({
  groups: z
    .array(
      z.object({
        name: z.string().min(1).max(100),
        options: z.array(z.string().min(1).max(100)).max(20),
      }),
    )
    .max(3),
  variants: z
    .array(
      z.object({
        options: z.array(z.string().min(1).max(100)).min(1),
        price: z.coerce.number().int().nonnegative().max(1_000_000_000),
        stock: z.coerce.number().int().nonnegative().max(1_000_000),
        isActive: z.boolean().optional(),
      }),
    )
    .max(200),
});

/** `GET /api/merch` — the public storefront's search/filter/pagination. */
export const listCatalogQuerySchema = z
  .object({
    search: z.string().max(255).optional(),
    category: z.string().max(120).optional(),
    minPrice: z.coerce.number().int().nonnegative().optional(),
    maxPrice: z.coerce.number().int().nonnegative().optional(),
    sortBy: z.enum(["newest", "price_asc", "price_desc"]).optional(),
    page: z.coerce.number().int().positive().optional(),
    pageSize: z.coerce.number().int().positive().max(60).optional(),
  })
  .superRefine((data, ctx) => {
    if (data.minPrice !== undefined && data.maxPrice !== undefined && data.maxPrice < data.minPrice) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, path: ["maxPrice"], message: "maxPrice must be >= minPrice" });
    }
  });
