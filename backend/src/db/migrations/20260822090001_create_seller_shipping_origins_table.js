/**
 * One shipping departure address per seller (event organizer) — the origin
 * every merch shipping-cost quote is calculated from. Mandatory before the
 * owner may create products (services/product-service.js throws
 * SHIPPING_ORIGIN_REQUIRED), mirroring the email-config gate on events.
 *
 * Same one-row-per-owner shape as qris_configs. Region names/codes are
 * resolved server-side from the chosen api.co.id village, never free-typed.
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
export const up = async (knex) => {
  await knex.schema.createTable("seller_shipping_origins", (table) => {
    table.uuid("id").primary();
    table.uuid("owner_id").notNullable().unique();
    table.string("address", 500).notNullable();
    table.string("province", 120).notNullable();
    table.string("city", 120).notNullable();
    table.string("district", 120).notNullable();
    table.string("village", 120).notNullable();
    table.string("province_code", 8).notNullable();
    table.string("city_code", 8).notNullable();
    table.string("district_code", 12).notNullable();
    table.string("village_code", 16).notNullable();
    table.string("postal_code", 20).nullable();
    table.datetime("created_at").notNullable().defaultTo(knex.fn.now());
    table.datetime("updated_at").notNullable().defaultTo(knex.fn.now());

    table.foreign("owner_id").references("id").inTable("users").onDelete("CASCADE");
  });
};

/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
export const down = async (knex) => {
  await knex.schema.dropTableIfExists("seller_shipping_origins");
};
