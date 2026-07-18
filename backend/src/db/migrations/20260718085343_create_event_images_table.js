/**
 * Exactly one row per event should have is_poster = true — enforced in the
 * service layer, same reasoning as bank_accounts.is_default.
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
export const up = async (knex) => {
  await knex.schema.createTable("event_images", (table) => {
    table.uuid("id").primary();
    table.uuid("event_id").notNullable();
    table.string("image_url", 1024).notNullable();
    table.boolean("is_poster").notNullable().defaultTo(false);
    table.integer("width").unsigned().notNullable();
    table.integer("height").unsigned().notNullable();
    table.integer("sort_order").unsigned().notNullable().defaultTo(0);
    table.datetime("created_at").notNullable().defaultTo(knex.fn.now());

    table.foreign("event_id").references("id").inTable("events").onDelete("CASCADE");
    table.index("event_id");
    table.index(["event_id", "is_poster"]);
  });
};

/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
export const down = async (knex) => {
  await knex.schema.dropTableIfExists("event_images");
};
