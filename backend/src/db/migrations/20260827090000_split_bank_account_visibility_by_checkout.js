/**
 * Splits the all-or-nothing `is_visible` toggle into one flag per buyer-facing
 * checkout surface, so an owner can offer an account for ticket sales but not
 * merch (or vice versa). Both flags off = the old "hidden everywhere".
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
export const up = async (knex) => {
  await knex.schema.alterTable("bank_accounts", (table) => {
    table.boolean("show_on_ticket_checkout").notNullable().defaultTo(true);
    table.boolean("show_on_merch_checkout").notNullable().defaultTo(true);
  });

  await knex("bank_accounts").update({
    show_on_ticket_checkout: knex.ref("is_visible"),
    show_on_merch_checkout: knex.ref("is_visible"),
  });

  await knex.schema.alterTable("bank_accounts", (table) => {
    table.dropColumn("is_visible");
  });
};

/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
export const down = async (knex) => {
  await knex.schema.alterTable("bank_accounts", (table) => {
    table.boolean("is_visible").notNullable().defaultTo(true);
  });

  // Visible anywhere collapses back to visible — the closest single-flag fit.
  await knex("bank_accounts").update({
    is_visible: knex.raw("show_on_ticket_checkout or show_on_merch_checkout"),
  });

  await knex.schema.alterTable("bank_accounts", (table) => {
    table.dropColumn("show_on_ticket_checkout");
    table.dropColumn("show_on_merch_checkout");
  });
};
