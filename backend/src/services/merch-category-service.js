import * as merchCategoriesModule from "../repositories/merch-categories-repository.js";
import { conflict, notFound } from "../utils/http-error.js";

const { merchCategoriesRepository } = merchCategoriesModule;

/**
 * Super Admin table view: every category (active or not) with its live
 * product count.
 * @param {{ includeInactive?: boolean, withCounts?: boolean }} [options]
 */
export const list = ({ includeInactive = false, withCounts = false } = {}) =>
  withCounts
    ? merchCategoriesModule.listWithProductCounts({ includeInactive })
    : merchCategoriesRepository.list({ includeInactive });

/**
 * Guarded delete — a category referenced by any live product cannot be
 * removed (the Super Admin must first recategorize or delete those products).
 * @param {string} id
 */
export const remove = async (id) => {
  const category = await merchCategoriesRepository.findById(id);
  if (!category) throw notFound("CATEGORY_NOT_FOUND", "Category not found");

  const productCount = await merchCategoriesModule.countProducts(id);
  if (productCount > 0) {
    throw conflict(
      "CATEGORY_IN_USE",
      `Cannot delete "${category.name}" — ${productCount} product${productCount === 1 ? " still uses" : "s still use"} it`,
    );
  }

  await merchCategoriesModule.remove(id);
};
