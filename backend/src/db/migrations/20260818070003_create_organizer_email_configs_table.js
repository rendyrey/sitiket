/**
 * Per-organizer outgoing SMTP config — every buyer-facing email for an
 * organizer's events (OTP, ticket delivery, rejections, refunds) is sent
 * through this instead of the platform SMTP. One row per owner; required
 * before the owner can create events (enforced in event-service).
 *
 * `provider = "gmail"` rows are saved with the Gmail SMTP preset
 * (smtp.gmail.com:465, secure) — the organizer only supplies their address
 * and a Google App Password. `provider = "custom"` rows carry a full
 * host/port/secure config. `smtp_password_encrypted` is AES-256-GCM
 * encrypted at rest — see backend/src/utils/secret-box.js.
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
export const up = async (knex) => {
  await knex.schema.createTable("organizer_email_configs", (table) => {
    table.uuid("id").primary();
    table.uuid("owner_id").notNullable().unique();
    table.enu("provider", ["gmail", "custom"]).notNullable();
    table.string("smtp_host", 255).notNullable();
    table.integer("smtp_port").unsigned().notNullable();
    table.boolean("smtp_secure").notNullable().defaultTo(true);
    table.string("from_email", 255).notNullable();
    table.string("from_name", 255).nullable();
    table.text("smtp_password_encrypted").notNullable();
    table.datetime("verified_at").nullable();
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
  await knex.schema.dropTableIfExists("organizer_email_configs");
};
