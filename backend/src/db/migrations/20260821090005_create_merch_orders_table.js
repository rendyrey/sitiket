/**
 * A merch purchase from ONE seller. A multi-seller cart is split into one
 * merch_order per seller at checkout (payment is a manual transfer to each
 * seller's own bank account/QRIS, so a combined order could never be paid in
 * one go — the buyer is warned about the split in the checkout UI).
 *
 * Unlike ticket `orders`, merch checkout requires a signed-in buyer
 * (product decision), so `user_id` is NOT nullable and there is no guest
 * OTP machinery. Shipping fields are snapshots of the buyer's profile
 * address at checkout time — the seller arranges delivery themselves.
 *
 * Lifecycle: pending_payment -> awaiting_verification -> paid
 *            pending_payment -> expired (24h hold lapsed, stock released)
 *            pending_payment | awaiting_verification -> cancelled
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
export const up = async (knex) => {
  await knex.schema.createTable("merch_orders", (table) => {
    table.uuid("id").primary();
    table.uuid("seller_id").notNullable();
    table.uuid("user_id").notNullable();
    table.string("buyer_name", 255).notNullable();
    table.string("buyer_email", 255).notNullable();
    table.string("buyer_phone", 32).notNullable();
    table.string("shipping_address", 500).notNullable();
    table.string("shipping_city", 120).nullable();
    table.string("shipping_province", 120).nullable();
    table.string("shipping_postal_code", 20).nullable();
    table.string("buyer_note", 500).nullable();
    table.integer("subtotal_amount").unsigned().notNullable();
    table.integer("total_amount").unsigned().notNullable();
    table
      .enu("status", ["pending_payment", "awaiting_verification", "paid", "expired", "cancelled"])
      .notNullable()
      .defaultTo("pending_payment");
    table.datetime("payment_expires_at").notNullable();
    table.datetime("created_at").notNullable().defaultTo(knex.fn.now());
    table.datetime("updated_at").notNullable().defaultTo(knex.fn.now());

    table.foreign("seller_id").references("id").inTable("users");
    table.foreign("user_id").references("id").inTable("users");
    table.index("seller_id");
    table.index("user_id");
    table.index("status");
  });
};

/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
export const down = async (knex) => {
  await knex.schema.dropTableIfExists("merch_orders");
};
