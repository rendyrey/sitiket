/**
 * Queue of outbound emails processed by a background worker (see
 * services/email-job-service.js) instead of sending synchronously inside
 * the request that triggers a notification.
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
export const up = async (knex) => {
  await knex.schema.createTable("email_jobs", (table) => {
    table.uuid("id").primary();
    table.string("to_email", 255).notNullable();
    table.string("subject", 255).notNullable();
    table.text("text_body").notNullable();
    table.text("html_body").nullable();
    table.enu("status", ["pending", "processing", "sent", "failed"]).notNullable().defaultTo("pending");
    table.integer("attempts").notNullable().defaultTo(0);
    table.text("last_error").nullable();
    table.datetime("available_at").notNullable().defaultTo(knex.fn.now());
    table.datetime("sent_at").nullable();
    table.datetime("created_at").notNullable().defaultTo(knex.fn.now());
    table.datetime("updated_at").notNullable().defaultTo(knex.fn.now());

    table.index(["status", "available_at"]);
  });
};

/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
export const down = async (knex) => {
  await knex.schema.dropTableIfExists("email_jobs");
};
