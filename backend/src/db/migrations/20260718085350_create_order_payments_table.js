/**
 * One row per proof-of-transfer submission (one-to-many, not one-to-one) —
 * a rejected proof can be re-submitted. The row with the latest
 * submitted_at is authoritative for the order. See
 * docs/business/PAYMENT_VERIFICATION.md.
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
export const up = async (knex) => {
  await knex.schema.createTable("order_payments", (table) => {
    table.uuid("id").primary();
    table.uuid("order_id").notNullable();
    table.uuid("bank_account_id").notNullable();
    table.integer("amount").unsigned().notNullable();
    table.string("proof_image_url", 1024).notNullable();
    table.string("transfer_note", 500).nullable();
    table.enu("status", ["pending_review", "approved", "rejected"]).notNullable().defaultTo("pending_review");
    table.uuid("reviewed_by").nullable();
    table.datetime("reviewed_at").nullable();
    table.text("reviewer_notes").nullable();
    table.datetime("submitted_at").notNullable();

    table.foreign("order_id").references("id").inTable("orders").onDelete("CASCADE");
    table.foreign("bank_account_id").references("id").inTable("bank_accounts");
    table.foreign("reviewed_by").references("id").inTable("users").onDelete("SET NULL");
    table.index("order_id");
    table.index("status");
  });
};

/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
export const down = async (knex) => {
  await knex.schema.dropTableIfExists("order_payments");
};
