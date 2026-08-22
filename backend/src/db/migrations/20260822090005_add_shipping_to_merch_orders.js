/**
 * Shipping snapshot per merch order: the buyer's chosen courier and its
 * server-verified price at checkout time, plus the structured destination
 * (district/village + 10-digit codes) and the seller origin the quote was
 * calculated from. `total_amount` becomes subtotal + shipping_cost.
 *
 * All columns nullable / defaulted — orders created before courier shipping
 * existed have no quote to backfill.
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
export const up = async (knex) => {
  await knex.schema.alterTable("merch_orders", (table) => {
    table.string("shipping_district", 120).nullable();
    table.string("shipping_village", 120).nullable();
    table.string("shipping_village_code", 16).nullable();
    table.string("origin_village_code", 16).nullable();
    table.string("courier_code", 32).nullable();
    table.string("courier_name", 120).nullable();
    table.string("shipping_estimation", 64).nullable();
    table.integer("shipping_cost").unsigned().notNullable().defaultTo(0);
    table.integer("shipping_weight_grams").unsigned().nullable();
  });
};

/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
export const down = async (knex) => {
  await knex.schema.alterTable("merch_orders", (table) => {
    table.dropColumn("shipping_district");
    table.dropColumn("shipping_village");
    table.dropColumn("shipping_village_code");
    table.dropColumn("origin_village_code");
    table.dropColumn("courier_code");
    table.dropColumn("courier_name");
    table.dropColumn("shipping_estimation");
    table.dropColumn("shipping_cost");
    table.dropColumn("shipping_weight_grams");
  });
};
