/**
 * One row per purchased ticket unit — a 5-ticket order produces 5 rows here,
 * each with its own QR. See docs/business/CHECKIN_GATE_SYSTEM.md.
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
export const up = async (knex) => {
  await knex.schema.createTable("tickets", (table) => {
    table.uuid("id").primary();
    table.uuid("order_item_id").notNullable();
    table.string("ticket_code", 64).notNullable().unique();
    // HMAC-signed token embedding ticket_code + event_id — see utils/qr-token.js.
    table.text("qr_payload").notNullable();
    table.enu("status", ["issued", "used", "void"]).notNullable().defaultTo("issued");
    table.datetime("checked_in_at").nullable();
    table.uuid("checked_in_by").nullable();
    table.datetime("created_at").notNullable().defaultTo(knex.fn.now());

    table.foreign("order_item_id").references("id").inTable("order_items").onDelete("CASCADE");
    table.foreign("checked_in_by").references("id").inTable("users").onDelete("SET NULL");
    table.index("order_item_id");
    table.index("status");
  });
};

/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
export const down = async (knex) => {
  await knex.schema.dropTableIfExists("tickets");
};
