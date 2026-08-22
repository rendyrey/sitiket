/**
 * Physical package weight per product, in grams — the expedition API prices
 * by weight (kg, rounded up at quote time), so every sellable product needs
 * one. Defaults to 1000g (1kg, the couriers' minimum billable weight) so
 * pre-existing products stay quotable without seller action.
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
export const up = async (knex) => {
  await knex.schema.alterTable("products", (table) => {
    table.integer("weight_grams").unsigned().notNullable().defaultTo(1000);
  });
};

/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
export const down = async (knex) => {
  await knex.schema.alterTable("products", (table) => {
    table.dropColumn("weight_grams");
  });
};
