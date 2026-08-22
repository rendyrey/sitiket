/**
 * Structured Indonesian region fields for the buyer delivery address.
 *
 * The flat `city`/`province` text columns (20260821090000) stay for display,
 * but shipping-cost quotes need the api.co.id region hierarchy — most
 * importantly the 10-digit `village_code`, which is what the expedition API
 * keys origins/destinations on. Codes and names are resolved server-side
 * from the buyer's chosen village (services/regional-service.js), never
 * free-typed, so a saved address is always quotable.
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
export const up = async (knex) => {
  await knex.schema.alterTable("users", (table) => {
    table.string("district", 120).nullable();
    table.string("village", 120).nullable();
    table.string("province_code", 8).nullable();
    table.string("city_code", 8).nullable();
    table.string("district_code", 12).nullable();
    table.string("village_code", 16).nullable();
  });
};

/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
export const down = async (knex) => {
  await knex.schema.alterTable("users", (table) => {
    table.dropColumn("district");
    table.dropColumn("village");
    table.dropColumn("province_code");
    table.dropColumn("city_code");
    table.dropColumn("district_code");
    table.dropColumn("village_code");
  });
};
