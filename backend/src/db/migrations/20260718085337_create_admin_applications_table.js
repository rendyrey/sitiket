/**
 * Admin (event owner) onboarding requires super_admin approval — see
 * docs/business/SYSTEM_OVERVIEW.md §3.
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
export const up = async (knex) => {
  await knex.schema.createTable("admin_applications", (table) => {
    table.uuid("id").primary();
    table.uuid("user_id").notNullable();
    table.string("business_name", 255).notNullable();
    table.text("business_description").nullable();
    table.string("contact_phone", 32).notNullable();
    table.enu("status", ["pending", "approved", "rejected"]).notNullable().defaultTo("pending");
    table.uuid("reviewed_by").nullable();
    table.datetime("reviewed_at").nullable();
    table.text("review_notes").nullable();
    table.datetime("created_at").notNullable().defaultTo(knex.fn.now());

    table.foreign("user_id").references("id").inTable("users").onDelete("CASCADE");
    table.foreign("reviewed_by").references("id").inTable("users").onDelete("SET NULL");
    table.index("user_id");
    table.index("status");
  });
};

/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
export const down = async (knex) => {
  await knex.schema.dropTableIfExists("admin_applications");
};
