/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
export const up = async (knex) => {
  await knex.schema.createTable("events", (table) => {
    table.uuid("id").primary();
    table.uuid("owner_id").notNullable();
    table.uuid("category_id").notNullable();
    table.string("name", 255).notNullable();
    table.string("slug", 255).notNullable().unique();
    table.text("description").notNullable();
    table.enu("status", ["draft", "published", "cancelled", "completed"]).notNullable().defaultTo("draft");
    // Independent from `status` — lets an owner hide a published event without reclassifying it.
    table.boolean("is_visible").notNullable().defaultTo(true);
    table.datetime("start_date").notNullable();
    table.datetime("end_date").notNullable();
    table.string("venue_name", 255).nullable();
    table.string("address", 500).nullable();
    table.string("city", 120).nullable();
    table.string("province", 120).nullable();
    table.string("country", 120).notNullable().defaultTo("Indonesia");
    table.string("meeting_url", 1024).nullable();
    table.enu("meeting_platform", ["zoom", "google_meet", "other"]).nullable();
    table.string("contact_person_name", 255).notNullable();
    table.string("contact_person_email", 255).notNullable();
    table.string("contact_person_phone", 32).notNullable();
    table.uuid("bank_account_id").nullable();
    table.integer("max_tickets_per_user").unsigned().notNullable().defaultTo(10);
    table.datetime("created_at").notNullable().defaultTo(knex.fn.now());
    table.datetime("updated_at").notNullable().defaultTo(knex.fn.now());

    table.foreign("owner_id").references("id").inTable("users");
    table.foreign("category_id").references("id").inTable("event_categories");
    table.foreign("bank_account_id").references("id").inTable("bank_accounts").onDelete("SET NULL");
    table.index("owner_id");
    table.index("category_id");
    table.index("status");
    table.index("is_visible");

    table.check("?? >= ??", ["end_date", "start_date"], "events_end_after_start_chk");
  });
};

/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
export const down = async (knex) => {
  await knex.schema.dropTableIfExists("events");
};
