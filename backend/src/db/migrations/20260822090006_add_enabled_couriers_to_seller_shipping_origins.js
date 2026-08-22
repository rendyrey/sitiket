/**
 * Per-seller courier whitelist: the JSON array of courier codes the seller
 * offers at checkout (e.g. `["JNE","JT"]`). NULL means "all couriers" — the
 * default, and what new vendor couriers fall under until the seller narrows
 * the list. Quote and order pricing both filter by it server-side.
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
export const up = async (knex) => {
  await knex.schema.alterTable("seller_shipping_origins", (table) => {
    table.json("enabled_couriers").nullable();
  });
};

/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
export const down = async (knex) => {
  await knex.schema.alterTable("seller_shipping_origins", (table) => {
    table.dropColumn("enabled_couriers");
  });
};
