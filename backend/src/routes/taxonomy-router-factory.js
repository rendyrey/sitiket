import { Router } from "express";
import { makeTaxonomyController } from "../controllers/taxonomy-controller.js";
import { optionalAuth, requireAuth, requireRole } from "../middleware/auth.js";
import { validate } from "../middleware/validate.js";
import { createTaxonomySchema, listTaxonomyQuerySchema, updateTaxonomySchema } from "../schemas/taxonomy-schemas.js";

/**
 * Builds the shared route set for a taxonomy resource (event categories /
 * ticket categories): public read, super_admin-only write.
 * @param {ReturnType<typeof import("../repositories/taxonomy-repository.js").makeTaxonomyRepository>} repository
 */
export const makeTaxonomyRouter = (repository) => {
  const router = Router();
  const controller = makeTaxonomyController(repository);

  router.get("/", optionalAuth, validate(listTaxonomyQuerySchema, "query"), controller.list);
  router.post("/", requireAuth, requireRole("super_admin"), validate(createTaxonomySchema), controller.create);
  router.patch("/:id", requireAuth, requireRole("super_admin"), validate(updateTaxonomySchema), controller.update);

  return router;
};
