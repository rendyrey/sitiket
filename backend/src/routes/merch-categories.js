import { Router } from "express";
import { z } from "zod";
import * as merchCategoryController from "../controllers/merch-category-controller.js";
import { optionalAuth, requireAuth, requireRole } from "../middleware/auth.js";
import { validate } from "../middleware/validate.js";
import { createTaxonomySchema, updateTaxonomySchema } from "../schemas/taxonomy-schemas.js";

const booleanFlag = z
  .enum(["true", "false"])
  .optional()
  .transform((value) => value === "true");

// The shared taxonomy query schema plus `withCounts` (the Super Admin
// products-per-category table).
const listMerchCategoriesQuerySchema = z.object({
  includeInactive: booleanFlag,
  withCounts: booleanFlag,
});

/**
 * Same shape as the taxonomy router factory (public read, super_admin-only
 * write) — kept separate because merch categories additionally support
 * counts and guarded deletion.
 */
export const merchCategoryRouter = Router();

merchCategoryRouter.get(
  "/",
  optionalAuth,
  validate(listMerchCategoriesQuerySchema, "query"),
  merchCategoryController.list,
);
merchCategoryRouter.post(
  "/",
  requireAuth,
  requireRole("super_admin"),
  validate(createTaxonomySchema),
  merchCategoryController.create,
);
merchCategoryRouter.patch(
  "/:id",
  requireAuth,
  requireRole("super_admin"),
  validate(updateTaxonomySchema),
  merchCategoryController.update,
);
merchCategoryRouter.delete("/:id", requireAuth, requireRole("super_admin"), merchCategoryController.remove);
