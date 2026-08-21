/**
 * Multi-level product options, Shopee/Tokopedia style:
 *
 * - `product_option_groups`: the axes a buyer picks along ("Color", "Size").
 * - `product_options`: the values within a group ("Red", "Blue" / "S", "M").
 * - `product_variants`: one sellable combination (e.g. Red + M) with its OWN
 *   price and stock — different combinations can cost differently.
 * - `product_variant_options`: which option from each group a variant is
 *   made of (one row per group per variant).
 *
 * The whole option/variant config is replaced atomically via
 * services/product-service.js `replaceVariantConfig` — merch_order_items
 * snapshot the variant label/price, so replacing config never corrupts
 * historical orders (their variant_id FK is ON DELETE SET NULL).
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
export const up = async (knex) => {
  await knex.schema.createTable("product_option_groups", (table) => {
    table.uuid("id").primary();
    table.uuid("product_id").notNullable();
    table.string("name", 100).notNullable();
    table.integer("position").unsigned().notNullable().defaultTo(0);
    table.datetime("created_at").notNullable().defaultTo(knex.fn.now());

    table.foreign("product_id").references("id").inTable("products").onDelete("CASCADE");
    table.index("product_id");
  });

  await knex.schema.createTable("product_options", (table) => {
    table.uuid("id").primary();
    table.uuid("group_id").notNullable();
    table.string("value", 100).notNullable();
    table.integer("position").unsigned().notNullable().defaultTo(0);
    table.datetime("created_at").notNullable().defaultTo(knex.fn.now());

    table.foreign("group_id").references("id").inTable("product_option_groups").onDelete("CASCADE");
    table.index("group_id");
  });

  await knex.schema.createTable("product_variants", (table) => {
    table.uuid("id").primary();
    table.uuid("product_id").notNullable();
    // Human-readable combination snapshot, e.g. "Red / M" — also copied onto
    // merch_order_items so an order stays legible after a config replace.
    table.string("label", 255).notNullable();
    table.integer("price").unsigned().notNullable();
    table.integer("stock").unsigned().notNullable().defaultTo(0);
    table.integer("quantity_sold").unsigned().notNullable().defaultTo(0);
    table.boolean("is_active").notNullable().defaultTo(true);
    table.datetime("created_at").notNullable().defaultTo(knex.fn.now());
    table.datetime("updated_at").notNullable().defaultTo(knex.fn.now());

    table.foreign("product_id").references("id").inTable("products").onDelete("CASCADE");
    table.index("product_id");
  });

  await knex.schema.createTable("product_variant_options", (table) => {
    table.uuid("id").primary();
    table.uuid("variant_id").notNullable();
    table.uuid("option_id").notNullable();

    table.foreign("variant_id").references("id").inTable("product_variants").onDelete("CASCADE");
    table.foreign("option_id").references("id").inTable("product_options").onDelete("CASCADE");
    table.unique(["variant_id", "option_id"]);
  });
};

/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
export const down = async (knex) => {
  await knex.schema.dropTableIfExists("product_variant_options");
  await knex.schema.dropTableIfExists("product_variants");
  await knex.schema.dropTableIfExists("product_options");
  await knex.schema.dropTableIfExists("product_option_groups");
};
