import { db } from "../config/db.js";
import { makeTaxonomyRepository } from "./taxonomy-repository.js";

const TABLE = "merch_categories";

/**
 * `merch_categories` shares the exact taxonomy shape of event/ticket
 * categories, so the shared repository covers list/find/create/update.
 * The extras below exist because — unlike the other taxonomies — merch
 * categories support guarded deletion and a per-category product count
 * for the Super Admin table.
 */
export const merchCategoriesRepository = makeTaxonomyRepository(TABLE);

/**
 * Live (non-soft-deleted) products referencing a category — the delete guard.
 * @param {string} categoryId
 * @returns {Promise<number>}
 */
export const countProducts = async (categoryId) => {
  const [{ total }] = await db("products")
    .where({ category_id: categoryId })
    .whereNull("deleted_at")
    .count({ total: "id" });
  return Number(total);
};

/**
 * Category rows with their live product counts, for the Super Admin table.
 * @param {{ includeInactive?: boolean }} [options]
 */
export const listWithProductCounts = ({ includeInactive = false } = {}) => {
  const query = db(TABLE)
    .select(
      `${TABLE}.*`,
      db.raw(
        `COALESCE((SELECT COUNT(*) FROM products WHERE products.category_id = ${TABLE}.id AND products.deleted_at IS NULL), 0) as product_count`,
      ),
    )
    .orderBy("sort_order", "asc");
  if (!includeInactive) query.where({ is_active: true });
  return query;
};

/** @param {string} id */
export const remove = (id) => db(TABLE).where({ id }).delete();
