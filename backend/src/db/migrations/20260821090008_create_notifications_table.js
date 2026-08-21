/**
 * In-app (web) notifications shown in the header bell dropdown — new ticket
 * orders and merch orders for sellers, payment updates for buyers. Rows are
 * written fire-and-forget by services/web-notification-service.js next to
 * (never instead of) the email notifications.
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
export const up = async (knex) => {
  await knex.schema.createTable("notifications", (table) => {
    table.uuid("id").primary();
    table.uuid("user_id").notNullable();
    // Machine-readable kind, e.g. "ticket_order_placed", "merch_payment_submitted".
    table.string("type", 50).notNullable();
    table.string("title", 255).notNullable();
    table.string("body", 500).notNullable();
    // Frontend route the notification links to, e.g. "/dashboard/admin/merch/orders".
    table.string("href", 500).nullable();
    table.datetime("read_at").nullable();
    table.datetime("created_at").notNullable().defaultTo(knex.fn.now());

    table.foreign("user_id").references("id").inTable("users").onDelete("CASCADE");
    table.index(["user_id", "read_at"]);
    table.index(["user_id", "created_at"]);
  });
};

/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
export const down = async (knex) => {
  await knex.schema.dropTableIfExists("notifications");
};
