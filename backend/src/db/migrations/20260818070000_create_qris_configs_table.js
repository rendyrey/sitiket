/**
 * One static QRIS code per organizer — the image they exported from their
 * bank/PSP merchant app. Events opt in per-event via `events.qris_enabled`;
 * buyers scan the image and pay, then upload proof exactly like a manual
 * bank transfer. See docs/business/PAYMENT_VERIFICATION.md.
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
export const up = async (knex) => {
  await knex.schema.createTable("qris_configs", (table) => {
    table.uuid("id").primary();
    table.uuid("owner_id").notNullable().unique();
    table.string("merchant_name", 255).notNullable();
    table.string("qris_image_url", 1024).notNullable();
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
  await knex.schema.dropTableIfExists("qris_configs");
};
