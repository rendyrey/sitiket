/**
 * Adds the promo-code discount snapshot to merch orders, mirroring the ticket
 * `orders` table (`promo_code_id` + `discount_amount`). `total_amount` becomes
 * `subtotal_amount - discount_amount + shipping_cost`.
 *
 * Both columns nullable / defaulted — orders created before merch promo codes
 * existed simply carry no promo and a zero discount.
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
export const up = async (knex) => {
  await knex.schema.alterTable("merch_orders", (table) => {
    table.uuid("promo_code_id").nullable();
    table.integer("discount_amount").unsigned().notNullable().defaultTo(0);

    table.foreign("promo_code_id").references("id").inTable("merch_promo_codes").onDelete("SET NULL");
  });
};

/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
export const down = async (knex) => {
  await knex.schema.alterTable("merch_orders", (table) => {
    table.dropForeign("promo_code_id");
    table.dropColumn("promo_code_id");
    table.dropColumn("discount_amount");
  });
};
