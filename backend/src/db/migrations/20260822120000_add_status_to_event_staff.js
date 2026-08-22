/**
 * Gate-staff invitations become accept/decline: new invites start "pending"
 * and only "accepted" rows may scan. Rows created before this migration were
 * active scanners from day one, so they are backfilled to "accepted".
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
export const up = async (knex) => {
  await knex.schema.alterTable("event_staff", (table) => {
    table.enu("status", ["pending", "accepted", "declined"]).notNullable().defaultTo("pending");
  });
  await knex("event_staff").update({ status: "accepted" });
};

/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
export const down = async (knex) => {
  await knex.schema.alterTable("event_staff", (table) => {
    table.dropColumn("status");
  });
};
