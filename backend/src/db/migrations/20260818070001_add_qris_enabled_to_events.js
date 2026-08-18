/**
 * Per-event opt-in for QRIS payment. Enabling requires the owner to have a
 * `qris_configs` row — enforced in the service layer, not here, so an owner
 * deleting their QRIS config later can't be blocked by the schema.
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
export const up = async (knex) => {
  await knex.schema.alterTable("events", (table) => {
    table.boolean("qris_enabled").notNullable().defaultTo(false);
  });
};

/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
export const down = async (knex) => {
  await knex.schema.alterTable("events", (table) => {
    table.dropColumn("qris_enabled");
  });
};
