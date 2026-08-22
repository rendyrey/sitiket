/**
 * DB-side time-window cache for api.co.id expedition shipping-cost quotes,
 * keyed on the exact request triple (origin village, destination village,
 * integer weight in kg). Courier prices drift, so the window is short
 * (SHIPPING_COST_CACHE_HOURS, default 24) — but within it, repeat quotes for
 * the same lane cost zero vendor credits (checkout re-renders, the order
 * submit re-pricing the same lane, other buyers on a popular lane).
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
export const up = async (knex) => {
  await knex.schema.createTable("shipping_cost_cache", (table) => {
    table.string("origin_village_code", 16).notNullable();
    table.string("destination_village_code", 16).notNullable();
    table.integer("weight_kg").unsigned().notNullable();
    table.json("couriers").notNullable();
    table.datetime("fetched_at").notNullable();

    table.primary(["origin_village_code", "destination_village_code", "weight_kg"]);
  });
};

/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
export const down = async (knex) => {
  await knex.schema.dropTableIfExists("shipping_cost_cache");
};
