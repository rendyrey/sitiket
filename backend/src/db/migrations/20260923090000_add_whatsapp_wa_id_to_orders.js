/**
 * Links an order placed through the WhatsApp bot to the WhatsApp account that
 * placed it (Meta's `wa_id`, e.g. "628112003717"). The bot authorizes every
 * follow-up action (email OTP, payment instructions, proof upload) against this
 * column — never against `buyer_phone`, which web buyers type by hand and so
 * proves nothing about who is chatting. Null for web orders.
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
export const up = async (knex) => {
  await knex.schema.alterTable("orders", (table) => {
    table.string("whatsapp_wa_id", 32).nullable().index();
  });
};

/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
export const down = async (knex) => {
  await knex.schema.alterTable("orders", (table) => {
    table.dropColumn("whatsapp_wa_id");
  });
};
