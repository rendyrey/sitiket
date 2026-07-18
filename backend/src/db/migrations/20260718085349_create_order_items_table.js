/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
export const up = async (knex) => {
  await knex.schema.createTable("order_items", (table) => {
    table.uuid("id").primary();
    table.uuid("order_id").notNullable();
    table.uuid("ticket_type_id").notNullable();
    table.integer("quantity").unsigned().notNullable();
    // Snapshot of ticket_types.price at purchase time — never re-read the live price after purchase.
    table.integer("unit_price").unsigned().notNullable();
    table.integer("subtotal").unsigned().notNullable();
    table.datetime("created_at").notNullable().defaultTo(knex.fn.now());

    table.foreign("order_id").references("id").inTable("orders").onDelete("CASCADE");
    table.foreign("ticket_type_id").references("id").inTable("ticket_types");
    table.index("order_id");
    table.index("ticket_type_id");
  });
};

/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
export const down = async (knex) => {
  await knex.schema.dropTableIfExists("order_items");
};
