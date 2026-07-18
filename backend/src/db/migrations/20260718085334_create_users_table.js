/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
export const up = async (knex) => {
  await knex.schema.createTable("users", (table) => {
    table.uuid("id").primary();
    table.string("google_sub", 255).notNullable().unique();
    table.string("email", 255).notNullable().unique();
    table.datetime("email_verified_at").nullable();
    table.string("name", 255).notNullable();
    table.string("phone", 32).nullable();
    table.string("avatar_url", 1024).nullable();
    table.enu("role", ["user", "admin", "super_admin"]).notNullable().defaultTo("user");
    table.enu("status", ["active", "suspended"]).notNullable().defaultTo("active");
    table.datetime("created_at").notNullable().defaultTo(knex.fn.now());
    table.datetime("updated_at").notNullable().defaultTo(knex.fn.now());

    table.index("role");
    table.index("status");
  });
};

/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
export const down = async (knex) => {
  await knex.schema.dropTableIfExists("users");
};
