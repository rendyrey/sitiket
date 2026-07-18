/**
 * Global taxonomy tables — managed exclusively by super_admin.
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
export const up = async (knex) => {
  const buildTaxonomyTable = (table) => {
    table.uuid("id").primary();
    table.string("name", 100).notNullable();
    table.string("slug", 120).notNullable().unique();
    table.boolean("is_active").notNullable().defaultTo(true);
    table.integer("sort_order").unsigned().notNullable().defaultTo(0);
    table.datetime("created_at").notNullable().defaultTo(knex.fn.now());
    table.datetime("updated_at").notNullable().defaultTo(knex.fn.now());
  };

  await knex.schema.createTable("event_categories", buildTaxonomyTable);
  await knex.schema.createTable("ticket_categories", buildTaxonomyTable);
};

/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
export const down = async (knex) => {
  await knex.schema.dropTableIfExists("ticket_categories");
  await knex.schema.dropTableIfExists("event_categories");
};
