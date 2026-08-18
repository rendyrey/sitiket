/**
 * Routes each queued email to an SMTP transport: `owner_id` set means "send
 * through that organizer's `organizer_email_configs` row", NULL means "send
 * through the platform SMTP from env" (super-admin/application emails).
 * Resolved at send time by services/email-job-service.js so a config saved
 * after enqueueing still applies.
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
export const up = async (knex) => {
  await knex.schema.alterTable("email_jobs", (table) => {
    table.uuid("owner_id").nullable();
    table.foreign("owner_id").references("id").inTable("users").onDelete("SET NULL");
    table.index("owner_id");
  });
};

/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
export const down = async (knex) => {
  await knex.schema.alterTable("email_jobs", (table) => {
    table.dropForeign("owner_id");
    table.dropIndex("owner_id");
    table.dropColumn("owner_id");
  });
};
