import { conflict, notFound } from "../utils/http-error.js";

const isDuplicateEntryError = (error) => error?.code === "ER_DUP_ENTRY";

/**
 * Builds list/create/update handlers for a taxonomy repository
 * (`event_categories` or `ticket_categories` — see repositories/taxonomy-repository.js).
 * Both are Super-Admin-managed lookups with identical shape and rules, so
 * the handler logic is written once and reused for each table.
 * @param {ReturnType<typeof import("../repositories/taxonomy-repository.js").makeTaxonomyRepository>} repository
 */
export const makeTaxonomyController = (repository) => ({
  /** Public list — only active rows, unless the caller is a super_admin explicitly asking for all. */
  list: async (request, response) => {
    const includeInactive = Boolean(request.query.includeInactive) && request.user?.role === "super_admin";
    const rows = await repository.list({ includeInactive });
    response.status(200).json({ data: rows });
  },

  create: async (request, response) => {
    try {
      const row = await repository.create(request.body);
      response.status(201).json({ data: row });
    } catch (error) {
      if (isDuplicateEntryError(error)) throw conflict("SLUG_TAKEN", `Slug "${request.body.slug}" is already in use`);
      throw error;
    }
  },

  update: async (request, response) => {
    const existing = await repository.findById(request.params.id);
    if (!existing) throw notFound("CATEGORY_NOT_FOUND", "Category not found");

    try {
      const row = await repository.update(request.params.id, request.body);
      response.status(200).json({ data: row });
    } catch (error) {
      if (isDuplicateEntryError(error)) throw conflict("SLUG_TAKEN", `Slug "${request.body.slug}" is already in use`);
      throw error;
    }
  },
});
