/**
 * On-the-spot (door) sales tally — counts and money only, no buyer data and
 * no issued tickets/QRs. Recorded live at the gate or in bulk after the
 * event, by the organizer or accepted gate staff.
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
export const up = async (knex) => {
  await knex.schema.createTable("onsite_ticket_sales", (table) => {
    table.uuid("id").primary();
    table.uuid("event_id").notNullable();
    table.uuid("ticket_type_id").notNullable();
    table.integer("quantity").unsigned().notNullable();
    // Price snapshot per ticket at recording time — door prices can differ
    // from the online tier price, so it is entered (prefilled) not derived.
    table.integer("unit_price").unsigned().notNullable();
    table.string("note", 255).nullable();
    table.uuid("recorded_by").nullable();
    table.datetime("created_at").notNullable().defaultTo(knex.fn.now());

    table.foreign("event_id").references("id").inTable("events").onDelete("CASCADE");
    table.foreign("ticket_type_id").references("id").inTable("ticket_types");
    table.foreign("recorded_by").references("id").inTable("users").onDelete("SET NULL");
    table.index("event_id");
  });
};

/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
export const down = async (knex) => {
  await knex.schema.dropTableIfExists("onsite_ticket_sales");
};
