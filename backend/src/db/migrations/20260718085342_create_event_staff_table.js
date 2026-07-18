/**
 * Delegated gate-scanner accounts per event — see docs/business/CHECKIN_GATE_SYSTEM.md §3.
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
export const up = async (knex) => {
  await knex.schema.createTable("event_staff", (table) => {
    table.uuid("id").primary();
    table.uuid("event_id").notNullable();
    table.uuid("user_id").notNullable();
    table.enu("role", ["scanner"]).notNullable().defaultTo("scanner");
    table.uuid("invited_by").notNullable();
    table.datetime("created_at").notNullable().defaultTo(knex.fn.now());

    table.foreign("event_id").references("id").inTable("events").onDelete("CASCADE");
    table.foreign("user_id").references("id").inTable("users").onDelete("CASCADE");
    table.foreign("invited_by").references("id").inTable("users");
    table.unique(["event_id", "user_id"]);
  });
};

/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
export const down = async (knex) => {
  await knex.schema.dropTableIfExists("event_staff");
};
