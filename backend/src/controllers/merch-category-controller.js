import { makeTaxonomyController } from "./taxonomy-controller.js";
import { merchCategoriesRepository } from "../repositories/merch-categories-repository.js";
import * as merchCategoryService from "../services/merch-category-service.js";

// create/update behave exactly like the other taxonomies (slug-collision
// handling included); list and delete need merch-specific behavior below.
const taxonomyController = makeTaxonomyController(merchCategoriesRepository);

export const create = taxonomyController.create;
export const update = taxonomyController.update;

/**
 * GET /api/merch-categories — public list of active categories; a super_admin
 * may ask for inactive rows and/or per-category product counts (their
 * dashboard table).
 */
export const list = async (request, response) => {
  const isSuperAdmin = request.user?.role === "super_admin";
  const rows = await merchCategoryService.list({
    includeInactive: Boolean(request.query.includeInactive) && isSuperAdmin,
    withCounts: Boolean(request.query.withCounts) && isSuperAdmin,
  });
  response.status(200).json({ data: rows });
};

/** DELETE /api/merch-categories/:id — guarded: 409 while products still use it. */
export const remove = async (request, response) => {
  await merchCategoryService.remove(request.params.id);
  response.status(204).end();
};
