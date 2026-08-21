/**
 * One cart line inside a merch order. The same product can appear on
 * multiple lines with different variants (Red/M and Red/L are separate
 * lines, Tokopedia-style). `product_name`/`variant_label`/`unit_price` are
 * snapshots taken at checkout so the order stays legible and priced
 * correctly even if the seller later renames the product or replaces its
 * variant config (which deletes/recreates variant rows — hence SET NULL).
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
export const up = async (knex) => {
  await knex.schema.createTable("merch_order_items", (table) => {
    table.uuid("id").primary();
    table.uuid("merch_order_id").notNullable();
    table.uuid("product_id").notNullable();
    table.uuid("variant_id").nullable();
    table.string("product_name", 255).notNullable();
    table.string("variant_label", 255).nullable();
    table.integer("quantity").unsigned().notNullable();
    table.integer("unit_price").unsigned().notNullable();
    table.integer("subtotal").unsigned().notNullable();
    table.datetime("created_at").notNullable().defaultTo(knex.fn.now());

    table.foreign("merch_order_id").references("id").inTable("merch_orders").onDelete("CASCADE");
    table.foreign("product_id").references("id").inTable("products");
    table.foreign("variant_id").references("id").inTable("product_variants").onDelete("SET NULL");
    table.index("merch_order_id");
    table.index("product_id");
  });
};

/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
export const down = async (knex) => {
  await knex.schema.dropTableIfExists("merch_order_items");
};
