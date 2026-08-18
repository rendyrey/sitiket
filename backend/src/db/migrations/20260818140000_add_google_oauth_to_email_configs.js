/**
 * Gmail organizers now connect via Google OAuth ("Connect Gmail") instead of
 * supplying an App Password: we store an encrypted refresh token and deliver
 * through the Gmail API (gmail.send scope). SMTP columns become nullable —
 * OAuth rows have no host/port/password. Legacy gmail rows that still carry
 * SMTP credentials keep sending over SMTP untouched.
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
export const up = async (knex) => {
  await knex.schema.alterTable("organizer_email_configs", (table) => {
    table.string("smtp_host", 255).nullable().alter();
    table.integer("smtp_port").unsigned().nullable().alter();
    table.text("smtp_password_encrypted").nullable().alter();
    table.text("google_refresh_token_encrypted").nullable();
  });
};

/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
export const down = async (knex) => {
  // Rows created via Google OAuth have no SMTP credentials — remove them
  // before restoring the NOT NULL constraints.
  await knex("organizer_email_configs").whereNotNull("google_refresh_token_encrypted").delete();
  await knex.schema.alterTable("organizer_email_configs", (table) => {
    table.dropColumn("google_refresh_token_encrypted");
    table.string("smtp_host", 255).notNullable().alter();
    table.integer("smtp_port").unsigned().notNullable().alter();
    table.text("smtp_password_encrypted").notNullable().alter();
  });
};
