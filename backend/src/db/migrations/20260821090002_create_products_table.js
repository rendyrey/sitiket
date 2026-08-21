/**
 * Merch items sold by an admin/organizer. `price`/`stock` on this row are the
 * base values, used only while the product has no variants; once variants
 * exist (see product_variants), each variant carries its own price/stock and
 * the base columns are ignored for selling.
 *
 * Products are soft-deleted (`deleted_at`) so historical merch_order_items
 * keep a resolvable product reference.
 *
 * The FULLTEXT index backs the public catalog's relevance-ranked search
 * (repositories/products-repository.js `searchCatalog`).
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
export const up = async (knex) => {
  await knex.schema.createTable("products", (table) => {
    table.uuid("id").primary();
    table.uuid("owner_id").notNullable();
    table.uuid("category_id").notNullable();
    table.string("name", 255).notNullable();
    table.string("slug", 280).notNullable().unique();
    table.text("description").notNullable();
    table.integer("price").unsigned().notNullable();
    table.integer("stock").unsigned().notNullable().defaultTo(0);
    table.integer("quantity_sold").unsigned().notNullable().defaultTo(0);
    table.boolean("is_active").notNullable().defaultTo(true);
    table.datetime("deleted_at").nullable();
    table.datetime("created_at").notNullable().defaultTo(knex.fn.now());
    table.datetime("updated_at").notNullable().defaultTo(knex.fn.now());

    table.foreign("owner_id").references("id").inTable("users");
    table.foreign("category_id").references("id").inTable("merch_categories");
    table.index("owner_id");
    table.index("category_id");
    table.index(["is_active", "deleted_at"]);
    table.index(["name", "description"], "products_search_fulltext", "FULLTEXT");
  });
};

/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
export const down = async (knex) => {
  await knex.schema.dropTableIfExists("products");
};
