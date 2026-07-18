/**
 * Payout accounts owned by an admin. Exactly one row per owner should have
 * is_default = true — enforced in the service layer (MySQL has no portable
 * partial-unique-index equivalent), not here.
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
export const up = async (knex) => {
  await knex.schema.createTable("bank_accounts", (table) => {
    table.uuid("id").primary();
    table.uuid("owner_id").notNullable();
    table.string("bank_name", 100).notNullable();
    table.string("account_number", 64).notNullable();
    table.string("account_holder_name", 255).notNullable();
    table.boolean("is_default").notNullable().defaultTo(false);
    table.datetime("created_at").notNullable().defaultTo(knex.fn.now());
    table.datetime("updated_at").notNullable().defaultTo(knex.fn.now());

    table.foreign("owner_id").references("id").inTable("users").onDelete("CASCADE");
    table.index("owner_id");
  });
};

/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
export const down = async (knex) => {
  await knex.schema.dropTableIfExists("bank_accounts");
};
