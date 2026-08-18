/**
 * A proof submission is now either a manual bank transfer or a QRIS payment.
 * `bank_account_id` becomes nullable because a QRIS payment has no payout
 * bank account to point at — the service layer guarantees it stays set for
 * `method = "bank_transfer"` rows.
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
export const up = async (knex) => {
  await knex.schema.alterTable("order_payments", (table) => {
    table.enu("method", ["bank_transfer", "qris"]).notNullable().defaultTo("bank_transfer");
  });

  // MySQL requires the FK dropped before the referencing column can be altered.
  await knex.schema.alterTable("order_payments", (table) => {
    table.dropForeign("bank_account_id");
  });
  await knex.schema.alterTable("order_payments", (table) => {
    table.uuid("bank_account_id").nullable().alter();
    table.foreign("bank_account_id").references("id").inTable("bank_accounts");
  });
};

/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
export const down = async (knex) => {
  await knex.schema.alterTable("order_payments", (table) => {
    table.dropForeign("bank_account_id");
  });
  await knex.schema.alterTable("order_payments", (table) => {
    // Fails if QRIS rows (bank_account_id = NULL) exist — expected; they have
    // no bank account to backfill.
    table.uuid("bank_account_id").notNullable().alter();
    table.foreign("bank_account_id").references("id").inTable("bank_accounts");
    table.dropColumn("method");
  });
};
