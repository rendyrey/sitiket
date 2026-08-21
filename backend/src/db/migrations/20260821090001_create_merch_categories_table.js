/**
 * Super-Admin-managed merch taxonomy — identical shape to the existing
 * event/ticket category tables so it can reuse the taxonomy repository.
 * Deletion is guarded in the service: a category with products cannot be
 * removed (see services/merch-category-service.js).
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
export const up = async (knex) => {
  await knex.schema.createTable("merch_categories", (table) => {
    table.uuid("id").primary();
    table.string("name", 100).notNullable();
    table.string("slug", 120).notNullable().unique();
    table.boolean("is_active").notNullable().defaultTo(true);
    table.integer("sort_order").unsigned().notNullable().defaultTo(0);
    table.datetime("created_at").notNullable().defaultTo(knex.fn.now());
    table.datetime("updated_at").notNullable().defaultTo(knex.fn.now());
  });
};

/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
export const down = async (knex) => {
  await knex.schema.dropTableIfExists("merch_categories");
};
