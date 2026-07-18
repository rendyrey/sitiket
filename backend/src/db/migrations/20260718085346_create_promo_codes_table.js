/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
export const up = async (knex) => {
  await knex.schema.createTable("promo_codes", (table) => {
    table.uuid("id").primary();
    table.uuid("event_id").notNullable();
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

    table.foreign("event_id").references("id").inTable("events").onDelete("CASCADE");
    table.unique(["event_id", "code"]);

    table.check("?? <= ??", ["used_count", "max_uses"], "promo_codes_used_within_max_chk");
  });
};

/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
export const down = async (knex) => {
  await knex.schema.dropTableIfExists("promo_codes");
};
