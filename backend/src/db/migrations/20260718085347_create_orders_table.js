/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
export const up = async (knex) => {
  await knex.schema.createTable("orders", (table) => {
    table.uuid("id").primary();
    table.uuid("event_id").notNullable();
    // Nullable — guest checkout never requires an account.
    table.uuid("user_id").nullable();
    table.string("buyer_name", 255).notNullable();
    table.string("buyer_email", 255).notNullable();
    table.string("buyer_phone", 32).notNullable();
    table.datetime("guest_email_verified_at").nullable();
    table.uuid("promo_code_id").nullable();
    table.integer("subtotal_amount").unsigned().notNullable();
    table.integer("discount_amount").unsigned().notNullable().defaultTo(0);
    table.integer("total_amount").unsigned().notNullable();
    table
      .enu("status", [
        "pending_payment",
        "awaiting_verification",
        "paid",
        "expired",
        "cancelled",
        "refund_requested",
        "refunded",
        "refund_rejected",
      ])
      .notNullable()
      .defaultTo("pending_payment");
    table.datetime("payment_expires_at").notNullable();
    table.datetime("created_at").notNullable().defaultTo(knex.fn.now());
    table.datetime("updated_at").notNullable().defaultTo(knex.fn.now());

    table.foreign("event_id").references("id").inTable("events");
    table.foreign("user_id").references("id").inTable("users").onDelete("SET NULL");
    table.foreign("promo_code_id").references("id").inTable("promo_codes").onDelete("SET NULL");
    table.index("event_id");
    table.index("user_id");
    table.index("status");
    table.index("buyer_email");
  });
};

/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
export const down = async (knex) => {
  await knex.schema.dropTableIfExists("orders");
};
