/**
 * Seller-scoped merch promo codes — the merch analogue of the event-scoped
 * `promo_codes` table. A code belongs to ONE seller (the merch "store" is the
 * container, just as an event is for ticket promos) and discounts that
 * seller's order at checkout. Usage is tracked in-row (`used_count`/`max_uses`)
 * with a DB CHECK so the cap can never be exceeded, and consumed atomically
 * inside the order-creation transaction.
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
export const up = async (knex) => {
  await knex.schema.createTable("merch_promo_codes", (table) => {
    table.uuid("id").primary();
    table.uuid("seller_id").notNullable();
    table.string("code", 64).notNullable();
    table.enu("discount_type", ["percentage", "fixed_amount"]).notNullable();
    table.decimal("discount_value", 12, 2).notNullable();
    table.integer("max_uses").unsigned().notNullable();
    table.integer("used_count").unsigned().notNullable().defaultTo(0);
    table.datetime("valid_from").nullable();
    table.datetime("valid_until").nullable();
    table.boolean("is_active").notNullable().defaultTo(true);
    table.datetime("created_at").notNullable().defaultTo(knex.fn.now());
    table.datetime("updated_at").notNullable().defaultTo(knex.fn.now());

    table.foreign("seller_id").references("id").inTable("users").onDelete("CASCADE");
    table.unique(["seller_id", "code"]);

    table.check("?? <= ??", ["used_count", "max_uses"], "merch_promo_codes_used_within_max_chk");
  });
};

/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
export const down = async (knex) => {
  await knex.schema.dropTableIfExists("merch_promo_codes");
};
