import { db } from "../config/db.js";
import { newId } from "../utils/id.js";

/**
 * Both `event_categories` and `ticket_categories` are identically shaped,
 * Super-Admin-managed lookup tables — see docs/business/DATABASE_DESIGN.md §4.2.
 * @param {"event_categories" | "ticket_categories"} table
 */
export const makeTaxonomyRepository = (table) => ({
  /** @param {{ includeInactive?: boolean }} [options] */
  list: ({ includeInactive = false } = {}) => {
    const query = db(table).orderBy("sort_order", "asc");
    if (!includeInactive) query.where({ is_active: true });
    return query;
  },

  findById: (id) => db(table).where({ id }).first(),

  findBySlug: (slug) => db(table).where({ slug }).first(),

  /** @param {{ name: string, slug: string, sortOrder?: number }} input */
  create: async ({ name, slug, sortOrder = 0 }) => {
    const id = newId();
    const now = new Date();
    await db(table).insert({
      id,
      name,
      slug,
      sort_order: sortOrder,
      is_active: true,
      created_at: now,
      updated_at: now,
    });
    return db(table).where({ id }).first();
  },

  /** @param {string} id @param {{ name?: string, slug?: string, sortOrder?: number, isActive?: boolean }} patch */
  update: async (id, { name, slug, sortOrder, isActive }) => {
    const changes = { updated_at: new Date() };
    if (name !== undefined) changes.name = name;
    if (slug !== undefined) changes.slug = slug;
    if (sortOrder !== undefined) changes.sort_order = sortOrder;
    if (isActive !== undefined) changes.is_active = isActive;

    await db(table).where({ id }).update(changes);
    return db(table).where({ id }).first();
  },
});
