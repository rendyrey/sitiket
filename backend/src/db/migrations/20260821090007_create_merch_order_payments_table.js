/**
 * Proof-of-transfer submissions for merch orders — same manual verification
 * model as ticket `order_payments` (one row per submission, a rejected proof
 * can be re-submitted, the latest submitted_at row is authoritative). See
 * docs/business/PAYMENT_VERIFICATION.md — merch reuses the exact flow, with
 * the SELLER (not an event owner) as the reviewer.
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
export const up = async (knex) => {
  await knex.schema.createTable("merch_order_payments", (table) => {
    table.uuid("id").primary();
    table.uuid("merch_order_id").notNullable();
    table.enu("method", ["bank_transfer", "qris"]).notNullable().defaultTo("bank_transfer");
    // Null when method is "qris" — QRIS proofs have no destination account.
    table.uuid("bank_account_id").nullable();
    table.integer("amount").unsigned().notNullable();
    table.string("proof_image_url", 1024).notNullable();
    table.string("transfer_note", 500).nullable();
    table.enu("status", ["pending_review", "approved", "rejected"]).notNullable().defaultTo("pending_review");
    table.uuid("reviewed_by").nullable();
    table.datetime("reviewed_at").nullable();
    table.text("reviewer_notes").nullable();
    table.datetime("submitted_at").notNullable();

    table.foreign("merch_order_id").references("id").inTable("merch_orders").onDelete("CASCADE");
    table.foreign("bank_account_id").references("id").inTable("bank_accounts");
    table.foreign("reviewed_by").references("id").inTable("users").onDelete("SET NULL");
    table.index("merch_order_id");
    table.index("status");
  });
};

/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
export const down = async (knex) => {
  await knex.schema.dropTableIfExists("merch_order_payments");
};
