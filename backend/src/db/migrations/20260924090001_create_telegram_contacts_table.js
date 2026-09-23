/**
 * Phone number a Telegram user shared with the bot via the "share contact"
 * button — Telegram vouches for it (the account's own verified number, and
 * the bot checks the shared contact belongs to the sender). It's how the
 * Telegram bot recognises a SiTIKET account (same phone match as WhatsApp),
 * kept in the DB so users don't have to share again after every restart.
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
export const up = async (knex) => {
  await knex.schema.createTable("telegram_contacts", (table) => {
    table.string("telegram_user_id", 32).primary();
    // Digits with country code, the same shape as a WhatsApp id. Example: "628112003717"
    table.string("phone", 32).notNullable();
    table.datetime("created_at").notNullable().defaultTo(knex.fn.now());
    table.datetime("updated_at").notNullable().defaultTo(knex.fn.now());
  });
};

/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
export const down = async (knex) => {
  await knex.schema.dropTableIfExists("telegram_contacts");
};
