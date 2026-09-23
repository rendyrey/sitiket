/**
 * Links an order placed through the Telegram bot to the Telegram user who
 * placed it (Telegram's numeric user id, e.g. "123456789" — also the private
 * chat id the tickets are delivered to). Same role as `whatsapp_wa_id`: the
 * bot authorizes follow-ups (email OTP, payment instructions, proof photo)
 * against it. Null for web and WhatsApp orders.
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
export const up = async (knex) => {
  await knex.schema.alterTable("orders", (table) => {
    table.string("telegram_user_id", 32).nullable().index();
  });
};

/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
export const down = async (knex) => {
  await knex.schema.alterTable("orders", (table) => {
    table.dropColumn("telegram_user_id");
  });
};
