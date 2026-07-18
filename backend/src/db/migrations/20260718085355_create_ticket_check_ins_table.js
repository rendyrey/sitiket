/**
 * Audit log of every scan attempt, not just successful ones — required to
 * investigate duplicate/fraudulent entry attempts. See
 * docs/business/CHECKIN_GATE_SYSTEM.md §6.
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
export const up = async (knex) => {
  await knex.schema.createTable("ticket_check_ins", (table) => {
    table.uuid("id").primary();
    table.uuid("ticket_id").notNullable();
    table.uuid("scanned_by").notNullable();
    table.datetime("scanned_at").notNullable();
    table.enu("result", ["success", "duplicate", "invalid", "expired"]).notNullable();
    table.string("device_label", 255).nullable();
    table.datetime("created_at").notNullable().defaultTo(knex.fn.now());

    table.foreign("ticket_id").references("id").inTable("tickets").onDelete("CASCADE");
    table.foreign("scanned_by").references("id").inTable("users");
    table.index("ticket_id");
    table.index("scanned_by");
  });
};

/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
export const down = async (knex) => {
  await knex.schema.dropTableIfExists("ticket_check_ins");
};
