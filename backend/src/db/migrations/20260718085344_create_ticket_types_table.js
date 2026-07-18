/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
export const up = async (knex) => {
  await knex.schema.createTable("ticket_types", (table) => {
    table.uuid("id").primary();
    table.uuid("event_id").notNullable();
    table.uuid("category_id").notNullable();
    table.string("name", 255).notNullable();
    table.integer("price").unsigned().notNullable();
    table.integer("quantity_total").unsigned().notNullable();
    table.integer("quantity_sold").unsigned().notNullable().defaultTo(0);
    table.datetime("sale_start_at").nullable();
    table.datetime("sale_end_at").nullable();
    table.boolean("is_active").notNullable().defaultTo(true);
    table.datetime("created_at").notNullable().defaultTo(knex.fn.now());
    table.datetime("updated_at").notNullable().defaultTo(knex.fn.now());

    table.foreign("event_id").references("id").inTable("events").onDelete("CASCADE");
    table.foreign("category_id").references("id").inTable("ticket_categories");
    table.index("event_id");
    table.index("category_id");

    table.check("?? <= ??", ["quantity_sold", "quantity_total"], "ticket_types_sold_within_total_chk");
  });
};

/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
export const down = async (knex) => {
  await knex.schema.dropTableIfExists("ticket_types");
};
