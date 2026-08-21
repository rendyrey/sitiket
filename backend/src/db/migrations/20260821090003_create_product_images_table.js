/**
 * Product photo gallery — up to 10 per product (enforced in
 * services/product-service.js, mirroring the Shopee/Tokopedia detail slider).
 * `sort_order` drives the slide sequence; the first image is the card thumbnail.
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
export const up = async (knex) => {
  await knex.schema.createTable("product_images", (table) => {
    table.uuid("id").primary();
    table.uuid("product_id").notNullable();
    table.string("image_url", 1024).notNullable();
    table.integer("sort_order").unsigned().notNullable().defaultTo(0);
    table.datetime("created_at").notNullable().defaultTo(knex.fn.now());

    table.foreign("product_id").references("id").inTable("products").onDelete("CASCADE");
    table.index("product_id");
  });
};

/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
export const down = async (knex) => {
  await knex.schema.dropTableIfExists("product_images");
};
