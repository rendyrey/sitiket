/**
 * DB-side time-window cache for api.co.id Indonesian region lists
 * (provinces/regencies/districts/villages). The vendor plan has a monthly
 * credit limit, so every list is fetched at most once per window
 * (REGION_CACHE_DAYS, default 30 — region data is near-static) and then
 * served from here. One row per request shape, e.g. `provinces`,
 * `regencies:31`, `districts:3172`, `villages:317205`.
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
export const up = async (knex) => {
  await knex.schema.createTable("region_cache", (table) => {
    table.string("cache_key", 64).primary();
    table.json("payload").notNullable();
    table.datetime("fetched_at").notNullable();
  });
};

/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
export const down = async (knex) => {
  await knex.schema.dropTableIfExists("region_cache");
};
