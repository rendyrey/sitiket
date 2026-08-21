import { db } from "../config/db.js";
import { newId } from "../utils/id.js";

/**
 * Read model for a product's option/variant config:
 * groups (with their options, in position order) + variants (each carrying
 * the option ids it is made of, so the frontend picker can match a selected
 * option combination to its variant).
 * @param {string} productId
 * @param {import("knex").Knex} [executor]
 */
export const getConfig = async (productId, executor = db) => {
  const groups = await executor("product_option_groups")
    .where({ product_id: productId })
    .orderBy("position", "asc");

  const options = groups.length
    ? await executor("product_options")
        .whereIn(
          "group_id",
          groups.map((group) => group.id),
        )
        .orderBy("position", "asc")
    : [];

  const variants = await executor("product_variants")
    .where({ product_id: productId })
    .orderBy("created_at", "asc");

  const variantOptions = variants.length
    ? await executor("product_variant_options").whereIn(
        "variant_id",
        variants.map((variant) => variant.id),
      )
    : [];

  return {
    groups: groups.map((group) => ({
      ...group,
      options: options.filter((option) => option.group_id === group.id),
    })),
    variants: variants.map((variant) => ({
      ...variant,
      option_ids: variantOptions
        .filter((row) => row.variant_id === variant.id)
        .map((row) => row.option_id),
    })),
  };
};

/** @param {string} variantId @param {import("knex").Knex} [executor] */
export const findVariantById = (variantId, executor = db) =>
  executor("product_variants").where({ id: variantId }).first();

/**
 * Replaces a product's ENTIRE option/variant config in one transaction.
 * Old groups/options/variants are deleted (merch_order_items.variant_id is
 * ON DELETE SET NULL and every order line snapshots its label/price, so
 * history survives) and the new config is inserted.
 *
 * @param {string} productId
 * @param {{
 *   groups: Array<{ name: string, options: string[] }>,
 *   variants: Array<{ options: string[], price: number, stock: number, isActive?: boolean }>,
 * }} config - `variants[].options[i]` is the chosen value from `groups[i]`
 */
export const replaceConfig = async (productId, config) => {
  await db.transaction(async (trx) => {
    await trx("product_variants").where({ product_id: productId }).delete();
    await trx("product_option_groups").where({ product_id: productId }).delete();

    const now = new Date();
    // value -> option id, per group index, to wire variants to their options.
    const optionIdByGroupAndValue = [];

    for (const [groupIndex, group] of config.groups.entries()) {
      const groupId = newId();
      await trx("product_option_groups").insert({
        id: groupId,
        product_id: productId,
        name: group.name,
        position: groupIndex,
        created_at: now,
      });

      optionIdByGroupAndValue[groupIndex] = new Map();
      const optionRows = group.options.map((value, optionIndex) => {
        const optionId = newId();
        optionIdByGroupAndValue[groupIndex].set(value, optionId);
        return { id: optionId, group_id: groupId, value, position: optionIndex, created_at: now };
      });
      if (optionRows.length) await trx("product_options").insert(optionRows);
    }

    for (const variant of config.variants) {
      const variantId = newId();
      await trx("product_variants").insert({
        id: variantId,
        product_id: productId,
        label: variant.options.join(" / "),
        price: variant.price,
        stock: variant.stock,
        quantity_sold: 0,
        is_active: variant.isActive ?? true,
        created_at: now,
        updated_at: now,
      });
      const optionLinks = variant.options.map((value, groupIndex) => ({
        id: newId(),
        variant_id: variantId,
        option_id: optionIdByGroupAndValue[groupIndex].get(value),
      }));
      if (optionLinks.length) await trx("product_variant_options").insert(optionLinks);
    }
  });

  return getConfig(productId);
};

/**
 * Atomically reserves variant stock — same guarded-UPDATE pattern as
 * ticket-types-repository.js `reserveInventory`.
 * @param {string} variantId
 * @param {number} quantity
 * @param {import("knex").Knex} executor - must be an open transaction
 * @returns {Promise<boolean>}
 */
export const reserveStock = async (variantId, quantity, executor) => {
  const affectedRows = await executor("product_variants")
    .where({ id: variantId })
    .andWhere(executor.raw("quantity_sold + ? <= stock", [quantity]))
    .update({ quantity_sold: executor.raw("quantity_sold + ?", [quantity]) });
  return affectedRows > 0;
};

/**
 * Releases previously reserved variant stock (order expired/cancelled unpaid).
 * The variant may have been deleted by a config replace in the meantime —
 * then this is a no-op, which is correct: the new config started from zero sold.
 * @param {string} variantId
 * @param {number} quantity
 * @param {import("knex").Knex} [executor]
 */
export const releaseStock = (variantId, quantity, executor = db) =>
  executor("product_variants")
    .where({ id: variantId })
    .update({ quantity_sold: executor.raw("GREATEST(quantity_sold - ?, 0)", [quantity]) });
