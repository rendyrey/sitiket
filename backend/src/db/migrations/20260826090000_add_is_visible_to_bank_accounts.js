/**
 * Lets an owner keep a bank account on file (e.g. for an event-specific
 * override) without exposing it in buyer-facing payment instructions.
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
export const up = async (knex) => {
  await knex.schema.alterTable("bank_accounts", (table) => {
    table.boolean("is_visible").notNullable().defaultTo(true);
  });
};

/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
export const down = async (knex) => {
  await knex.schema.alterTable("bank_accounts", (table) => {
    table.dropColumn("is_visible");
  });
};
