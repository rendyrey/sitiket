/**
 * Generic OTP verification shared by guest checkout and (rarely) account
 * email changes. A guest order may not proceed to payment until its
 * guest_checkout row here has verified_at set. See
 * docs/business/DATABASE_DESIGN.md §4.8.
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
export const up = async (knex) => {
  await knex.schema.createTable("email_verifications", (table) => {
    table.uuid("id").primary();
    table.string("email", 255).notNullable();
    table.enu("purpose", ["guest_checkout", "account"]).notNullable();
    table.uuid("order_id").nullable();
    table.uuid("user_id").nullable();
    table.string("code", 16).notNullable();
    table.datetime("expires_at").notNullable();
    table.datetime("verified_at").nullable();
    table.datetime("created_at").notNullable().defaultTo(knex.fn.now());

    table.foreign("order_id").references("id").inTable("orders").onDelete("CASCADE");
    table.foreign("user_id").references("id").inTable("users").onDelete("CASCADE");
    table.index("email");
    table.index("order_id");
  });
};

/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
export const down = async (knex) => {
  await knex.schema.dropTableIfExists("email_verifications");
};
