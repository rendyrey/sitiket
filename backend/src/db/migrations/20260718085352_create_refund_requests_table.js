/**
 * Manual/offline refunds, status-tracked only — no payment-gateway refund
 * API in v1. See docs/business/PAYMENT_VERIFICATION.md.
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
export const up = async (knex) => {
  await knex.schema.createTable("refund_requests", (table) => {
    table.uuid("id").primary();
    table.uuid("order_id").notNullable();
    // Nullable — a guest requester is identified via the order's buyer_email instead.
    table.uuid("requested_by").nullable();
    table.text("reason").notNullable();
    table.enu("status", ["requested", "approved", "rejected", "completed"]).notNullable().defaultTo("requested");
    table.uuid("processed_by").nullable();
    table.datetime("processed_at").nullable();
    table.text("notes").nullable();
    table.datetime("created_at").notNullable().defaultTo(knex.fn.now());
    table.datetime("updated_at").notNullable().defaultTo(knex.fn.now());

    table.foreign("order_id").references("id").inTable("orders").onDelete("CASCADE");
    table.foreign("requested_by").references("id").inTable("users").onDelete("SET NULL");
    table.foreign("processed_by").references("id").inTable("users").onDelete("SET NULL");
    table.index("order_id");
    table.index("status");
  });
};

/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
export const down = async (knex) => {
  await knex.schema.dropTableIfExists("refund_requests");
};
