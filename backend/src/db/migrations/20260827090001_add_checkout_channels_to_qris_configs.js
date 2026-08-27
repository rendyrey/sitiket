/**
 * Same per-checkout visibility split as bank_accounts: lets an owner offer
 * their QRIS code on ticket checkout, merch checkout, both, or neither —
 * without deleting the config. Ticket checkout additionally still requires
 * the event's own `qris_enabled` opt-in.
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
export const up = async (knex) => {
  await knex.schema.alterTable("qris_configs", (table) => {
    table.boolean("show_on_ticket_checkout").notNullable().defaultTo(true);
    table.boolean("show_on_merch_checkout").notNullable().defaultTo(true);
  });
};

/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
export const down = async (knex) => {
  await knex.schema.alterTable("qris_configs", (table) => {
    table.dropColumn("show_on_ticket_checkout");
    table.dropColumn("show_on_merch_checkout");
  });
};
