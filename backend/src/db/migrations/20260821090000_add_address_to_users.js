/**
 * Merch checkout requires a signed-in buyer with a delivery address on their
 * profile (product decision: sellers arrange delivery themselves, so the
 * platform only stores where to ship). Address lives on `users` and is
 * snapshotted onto each `merch_orders` row at checkout time.
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
export const up = async (knex) => {
  await knex.schema.alterTable("users", (table) => {
    table.string("address", 500).nullable();
    table.string("city", 120).nullable();
    table.string("province", 120).nullable();
    table.string("postal_code", 20).nullable();
  });
};

/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
export const down = async (knex) => {
  await knex.schema.alterTable("users", (table) => {
    table.dropColumn("address");
    table.dropColumn("city");
    table.dropColumn("province");
    table.dropColumn("postal_code");
  });
};
